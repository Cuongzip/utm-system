package com.utm.fleet.service;

import com.utm.commonlibrary.exception.AccessDeniedException;
import com.utm.commonlibrary.kafka.event.FlightLifecycleEvent;
import com.utm.fleet.mapper.FleetMapper;
import com.utm.fleet.model.FleetAssignment;
import com.utm.fleet.model.FleetConfiguration;
import com.utm.fleet.model.RebalancingTask;
import com.utm.fleet.model.enumeration.AssignmentStatus;
import com.utm.fleet.model.enumeration.RebalancingStatus;
import com.utm.fleet.repository.FleetAssignmentRepository;
import com.utm.fleet.repository.FleetConfigurationRepository;
import com.utm.fleet.repository.RebalancingTaskRepository;
import com.utm.fleet.service.client.FleetInteropClientService;
import com.utm.fleet.viewmodel.FleetDtos.AssignDronePostVm;
import com.utm.fleet.viewmodel.FleetDtos.AssignmentResultVm;
import com.utm.fleet.viewmodel.FleetDtos.DroneClientVm;
import com.utm.fleet.viewmodel.FleetDtos.FleetAssignmentVm;
import com.utm.fleet.viewmodel.FleetDtos.FleetConfigPutVm;
import com.utm.fleet.viewmodel.FleetDtos.FleetThresholdsVm;
import com.utm.fleet.viewmodel.FleetDtos.HubClientVm;
import com.utm.fleet.viewmodel.FleetDtos.MissionClientVm;
import com.utm.fleet.viewmodel.FleetDtos.RebalancingRecommendationVm;
import com.utm.fleet.viewmodel.FleetDtos.RebalancingTaskVm;
import com.utm.fleet.viewmodel.FleetDtos.ScoringWeightsVm;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: FleetServiceImpl & ScoringEngineService")
class FleetServiceImplTest {

    @Mock
    private FleetConfigurationRepository configRepository;

    @Mock
    private FleetAssignmentRepository assignmentRepository;

    @Mock
    private RebalancingTaskRepository rebalancingRepository;

    @Mock
    private FleetInteropClientService interopClient;

    private FleetServiceImpl fleetService;

    private FleetConfiguration balancedConfig;

    @BeforeEach
    void setUp() {
        ScoringEngineService scoringEngine = new ScoringEngineService();
        FleetMapper mapper = Mappers.getMapper(FleetMapper.class);
        fleetService = new FleetServiceImpl(
                configRepository, assignmentRepository, rebalancingRepository, scoringEngine, interopClient, mapper);

        balancedConfig = FleetConfiguration.builder()
                .id("cfg-balanced")
                .name("Balanced Mode")
                .weights(ScoringWeightsVm.balancedDefault())
                .thresholds(FleetThresholdsVm.balancedDefault())
                .isPreset(true)
                .isActive(true)
                .build();
    }

    @Test
    @DisplayName("assignDrone - scores multi-factor candidates and selects highest-scoring drone at departure hub")
    void assignDrone_selectsOptimalDroneAndSavesPendingAssignment() {
        HubClientVm hubA = new HubClientVm("hub-a", "HUB-A", "Saigon Central Hub", "ACTIVE", 10.7769, 106.7009, 10);
        HubClientVm hubB = new HubClientVm("hub-b", "HUB-B", "Thu Duc Hub", "ACTIVE", 10.8500, 106.7700, 10);

        DroneClientVm bestDrone = new DroneClientVm(
                "drone-best", "VN-DRN-01", "Matrice 350", "DJI", "available",
                "hub-a", "hub-a", 5.0, 25000.0, 96.0, 40.0,
                List.of("payload_release", "bvlos"), ZonedDateTime.now().plusDays(45));

        DroneClientVm remoteDrone = new DroneClientVm(
                "drone-remote", "VN-DRN-02", "Matrice 350", "DJI", "available",
                "hub-b", "hub-b", 5.0, 25000.0, 90.0, 180.0,
                List.of("payload_release", "bvlos"), ZonedDateTime.now().plusDays(10));

        MissionClientVm mission = new MissionClientVm(
                "msn-1", "MSN-001", "Urgent Delivery", "draft", "hub-a", "hub-b",
                null, 1.5, 8500.0, 600, List.of("payload_release"), null, ZonedDateTime.now());

        when(interopClient.getMissionById("msn-1")).thenReturn(Optional.of(mission));
        when(interopClient.getHubById("hub-a")).thenReturn(Optional.of(hubA));
        when(configRepository.findFirstByIsActiveTrue()).thenReturn(Optional.of(balancedConfig));
        when(interopClient.getAllDrones(null)).thenReturn(List.of(bestDrone, remoteDrone));
        when(interopClient.getMissionsByStatus("executing")).thenReturn(List.of());
        when(interopClient.getMissionsByStatus("scheduled")).thenReturn(List.of());
        when(interopClient.getAllHubs()).thenReturn(List.of(hubA, hubB));
        when(interopClient.getLatestBatteryLevel("drone-best")).thenReturn(Optional.of(95.0));
        when(interopClient.getLatestBatteryLevel("drone-remote")).thenReturn(Optional.of(85.0));
        when(assignmentRepository.save(any(FleetAssignment.class))).thenAnswer(inv -> {
            FleetAssignment a = inv.getArgument(0);
            a.setId("assign-1");
            return a;
        });

        AssignmentResultVm result = fleetService.assignDrone(new AssignDronePostVm("msn-1", null));

        assertThat(result.success()).isTrue();
        assertThat(result.selectedDrone().id()).isEqualTo("drone-best");
        assertThat(result.assignment().finalScore()).isGreaterThan(85.0);
        assertThat(result.alternatives()).hasSize(1);
        assertThat(result.alternatives().get(0).droneId()).isEqualTo("drone-remote");
    }

    @Test
    @DisplayName("acceptAssignment - transitions assignment to ACCEPTED and updates drone & mission")
    void acceptAssignment_updatesDroneAndMission() {
        FleetAssignment pending = FleetAssignment.builder()
                .id("assign-1")
                .missionId("msn-1")
                .droneId("drone-best")
                .status(AssignmentStatus.PENDING)
                .finalScore(92.5)
                .build();
        when(assignmentRepository.findById("assign-1")).thenReturn(Optional.of(pending));
        when(assignmentRepository.save(pending)).thenReturn(pending);

        FleetAssignmentVm accepted = fleetService.acceptAssignment("assign-1");

        assertThat(accepted.status()).isEqualTo("accepted");
        verify(interopClient).updateDroneStatus("drone-best", "standby");
        verify(interopClient).updateMissionDrone("msn-1", "drone-best");
    }

    @Test
    @DisplayName("analyzeRebalancingNeeds - recommends transferring drone from surplus donor hub to shortage hub")
    void analyzeRebalancingNeeds_recommendsDonorToShortageTransfer() {
        HubClientVm donorHub = new HubClientVm("hub-donor", "HUB-D", "Donor Hub", "ACTIVE", 10.77, 106.70, 10);
        HubClientVm needyHub = new HubClientVm("hub-needy", "HUB-N", "Shortage Hub", "ACTIVE", 10.80, 106.75, 10);

        List<DroneClientVm> drones = List.of(
                new DroneClientVm("d1", "VN-1", "M350", "DJI", "available", "hub-donor", "hub-donor", 5.0, 20000.0, 95.0, 20.0, List.of(), null),
                new DroneClientVm("d2", "VN-2", "M350", "DJI", "available", "hub-donor", "hub-donor", 5.0, 20000.0, 95.0, 50.0, List.of(), null),
                new DroneClientVm("d3", "VN-3", "M350", "DJI", "available", "hub-donor", "hub-donor", 5.0, 20000.0, 95.0, 80.0, List.of(), null)
        );

        when(configRepository.findFirstByIsActiveTrue()).thenReturn(Optional.of(balancedConfig));
        when(rebalancingRepository.countByStatus(RebalancingStatus.IN_PROGRESS)).thenReturn(0L);
        when(interopClient.getAllDrones(null)).thenReturn(drones);
        when(interopClient.getAllHubs()).thenReturn(List.of(donorHub, needyHub));
        when(interopClient.getLatestBatteryLevel("d1")).thenReturn(Optional.of(92.0));

        List<RebalancingRecommendationVm> recs = fleetService.analyzeRebalancingNeeds();

        assertThat(recs).hasSize(1);
        assertThat(recs.get(0).sourceHub().hubId()).isEqualTo("hub-donor");
        assertThat(recs.get(0).targetHub().hubId()).isEqualTo("hub-needy");
        assertThat(recs.get(0).recommendedDrone().id()).isEqualTo("d1");
        assertThat(recs.get(0).priority()).isEqualTo(100);
    }

    @Test
    @DisplayName("updateConfig - blocks modifying preset configurations with AccessDeniedException")
    void updateConfig_whenPreset_throwsAccessDenied() {
        when(configRepository.findById("cfg-balanced")).thenReturn(Optional.of(balancedConfig));

        assertThatThrownBy(() -> fleetService.updateConfig("cfg-balanced",
                new FleetConfigPutVm("Modified", null, null, null)))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("handleFlightLifecycleEvent - auto-completes IN_PROGRESS rebalancing task on FLIGHT_COMPLETED")
    void handleFlightLifecycleEvent_autoCompletesRebalancingTask() {
        RebalancingTask inProgress = RebalancingTask.builder()
                .id("reb-1")
                .sourceHubId("hub-donor")
                .targetHubId("hub-needy")
                .droneId("d1")
                .repositioningFlightId("flt-reposition-1")
                .status(RebalancingStatus.IN_PROGRESS)
                .priority(100)
                .build();

        when(rebalancingRepository.findFirstByRepositioningFlightIdAndStatus("flt-reposition-1", RebalancingStatus.IN_PROGRESS))
                .thenReturn(Optional.of(inProgress));
        when(rebalancingRepository.findById("reb-1")).thenReturn(Optional.of(inProgress));
        when(rebalancingRepository.save(inProgress)).thenReturn(inProgress);

        FlightLifecycleEvent completedEvent = new FlightLifecycleEvent(
                FlightLifecycleEvent.FLIGHT_COMPLETED, "flt-reposition-1", "FLT-001", "msn-rep", null,
                1, 1, "d1", "hub-donor", "hub-needy", "hub-needy", "completed", null, 0.3, null, ZonedDateTime.now());

        fleetService.handleFlightLifecycleEvent(completedEvent);

        assertThat(inProgress.getStatus()).isEqualTo(RebalancingStatus.COMPLETED);
        verify(interopClient).updateDroneHub("d1", "hub-needy");
        verify(interopClient).updateDroneStatus("d1", "available");
    }

    @Test
    @DisplayName("getFleetOverview & analyzeRebalancingNeeds - excludes inactive hubs from active fleet operations")
    void fleetOperations_excludeInactiveHubs() {
        HubClientVm activeHub = new HubClientVm("hub-active", "HUB-A", "Active Vertiport", "ACTIVE", 10.77, 106.70, 10);
        HubClientVm inactiveHub = new HubClientVm("hub-inactive", "HUB-I", "Retired Test Hub", "inactive", 10.80, 106.75, 10);

        List<DroneClientVm> drones = List.of(
                new DroneClientVm("d1", "VN-1", "M350", "DJI", "available", "hub-active", "hub-active", 5.0, 20000.0, 95.0, 20.0, List.of(), null),
                new DroneClientVm("d2", "VN-2", "M350", "DJI", "available", "hub-active", "hub-active", 5.0, 20000.0, 95.0, 30.0, List.of(), null),
                new DroneClientVm("d3", "VN-3", "M350", "DJI", "available", "hub-active", "hub-active", 5.0, 20000.0, 95.0, 40.0, List.of(), null)
        );

        when(interopClient.getAllDrones(null)).thenReturn(drones);
        when(interopClient.getAllHubs()).thenReturn(List.of(activeHub, inactiveHub));
        when(interopClient.getMissionsByStatus("executing")).thenReturn(List.of());
        when(interopClient.getMissionsByStatus("scheduled")).thenReturn(List.of());
        when(configRepository.findFirstByIsActiveTrue()).thenReturn(Optional.of(balancedConfig));
        when(rebalancingRepository.countByStatus(RebalancingStatus.IN_PROGRESS)).thenReturn(0L);

        var overview = fleetService.getFleetOverview();
        List<RebalancingRecommendationVm> recs = fleetService.analyzeRebalancingNeeds();

        assertThat(overview.hubStatuses()).hasSize(1);
        assertThat(overview.hubStatuses().getFirst().hubId()).isEqualTo("hub-active");
        assertThat(recs).isEmpty();
    }

    @Test
    @DisplayName("TelemetryClientVm - deserializes batteryPercentage alias from telemetry service")
    void telemetryClientVm_deserializesBatteryPercentageAlias() throws Exception {
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        var vm = mapper.readValue("""
                {"droneId":"d1","batteryPercentage":78.5}
                """, com.utm.fleet.viewmodel.FleetDtos.TelemetryClientVm.class);
        assertThat(vm.droneId()).isEqualTo("d1");
        assertThat(vm.batteryLevel()).isEqualTo(78.5);
    }
}

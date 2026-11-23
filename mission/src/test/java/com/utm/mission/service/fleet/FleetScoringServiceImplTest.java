package com.utm.mission.service.fleet;

import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.mission.model.Mission;
import com.utm.mission.model.Waypoint;
import com.utm.mission.repository.MissionRepository;
import com.utm.mission.repository.WaypointRepository;
import com.utm.mission.service.client.DroneClientService;
import com.utm.mission.viewmodel.client.DroneBriefVm;
import com.utm.mission.viewmodel.fleet.ScoredDroneCandidateVm;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: FleetScoringServiceImpl")
class FleetScoringServiceImplTest {

    @Mock
    private MissionRepository missionRepository;

    @Mock
    private WaypointRepository waypointRepository;

    @Mock
    private DroneClientService droneClientService;

    @InjectMocks
    private FleetScoringServiceImpl fleetScoringService;

    private static final String MISSION_ID = "msn-uuid-001";
    private static final String DEP_HUB_ID = "hub-dep-001";

    private Mission mission;
    private List<Waypoint> waypoints;

    @BeforeEach
    void setUp() {
        mission = Mission.builder()
                .id(MISSION_ID)
                .name("Medical Transport")
                .departureHubId(DEP_HUB_ID)
                .arrivalHubId("hub-arr-002")
                .payloadWeightKg(2.5) // requires 2.5 kg
                .build();

        // 2 waypoints roughly ~10 km apart
        Waypoint wp1 = Waypoint.builder().id("wp-1").sequence(1).latitude(10.77).longitude(106.70).altitude(50.0).build();
        Waypoint wp2 = Waypoint.builder().id("wp-2").sequence(2).latitude(10.85).longitude(106.70).altitude(50.0).build();
        waypoints = List.of(wp1, wp2);
    }

    @Test
    @DisplayName("scoreCandidateDrones - when drone max payload is less than mission required payload marks ineligible")
    void scoreCandidateDrones_whenPayloadExceedsMaxPayload_marksIneligible() {
        DroneBriefVm underpoweredDrone = new DroneBriefVm(
                "d-1", "VN-001", "DJI", "Mini 3", "available", DEP_HUB_ID, 200.0, 1.0); // maxPayload 1.0 < 2.5kg

        when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(mission));
        when(waypointRepository.findByMissionIdOrderBySequenceAsc(MISSION_ID)).thenReturn(waypoints);
        when(droneClientService.getAvailableDronesAtHub(DEP_HUB_ID)).thenReturn(List.of(underpoweredDrone));

        List<ScoredDroneCandidateVm> candidates = fleetScoringService.scoreCandidateDrones(MISSION_ID);

        assertThat(candidates).hasSize(1);
        ScoredDroneCandidateVm candidate = candidates.get(0);
        assertThat(candidate.eligible()).isFalse();
        assertThat(candidate.ineligibilityReason()).contains("Insufficient payload capacity");
        assertThat(candidate.finalScore()).isEqualTo(0.0);
    }

    @Test
    @DisplayName("scoreCandidateDrones - when drone battery is insufficient for distance with 20% reserve marks ineligible")
    void scoreCandidateDrones_whenBatteryInsufficient_marksIneligible() {
        DroneBriefVm lowBatteryDrone = new DroneBriefVm(
                "d-2", "VN-002", "Custom", "HeavyLift", "available", DEP_HUB_ID, 50.0, 5.0); // 50Wh is too small for 10km

        when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(mission));
        when(waypointRepository.findByMissionIdOrderBySequenceAsc(MISSION_ID)).thenReturn(waypoints);
        when(droneClientService.getAvailableDronesAtHub(DEP_HUB_ID)).thenReturn(List.of(lowBatteryDrone));

        List<ScoredDroneCandidateVm> candidates = fleetScoringService.scoreCandidateDrones(MISSION_ID);

        assertThat(candidates).hasSize(1);
        ScoredDroneCandidateVm candidate = candidates.get(0);
        assertThat(candidate.eligible()).isFalse();
        assertThat(candidate.ineligibilityReason()).contains("Insufficient battery range");
        assertThat(candidate.finalScore()).isEqualTo(0.0);
    }

    @Test
    @DisplayName("scoreCandidateDrones - when drones are eligible ranks higher battery and suitable payload first")
    void scoreCandidateDrones_whenEligible_ranksByScoreDescending() {
        DroneBriefVm droneGood = new DroneBriefVm(
                "d-good", "VN-GOOD", "DJI", "M350", "available", DEP_HUB_ID, 600.0, 3.5);
        DroneBriefVm droneBetter = new DroneBriefVm(
                "d-better", "VN-BETTER", "DJI", "FlyCart30", "available", DEP_HUB_ID, 1200.0, 4.0);

        when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(mission));
        when(waypointRepository.findByMissionIdOrderBySequenceAsc(MISSION_ID)).thenReturn(waypoints);
        when(droneClientService.getAvailableDronesAtHub(DEP_HUB_ID)).thenReturn(List.of(droneGood, droneBetter));

        List<ScoredDroneCandidateVm> candidates = fleetScoringService.scoreCandidateDrones(MISSION_ID);

        assertThat(candidates).hasSize(2);
        assertThat(candidates.get(0).eligible()).isTrue();
        assertThat(candidates.get(1).eligible()).isTrue();
        // The one with larger battery margin scores higher
        assertThat(candidates.get(0).finalScore()).isGreaterThanOrEqualTo(candidates.get(1).finalScore());
    }

    @Test
    @DisplayName("getBestCandidate - returns highest scoring eligible drone")
    void getBestCandidate_returnsHighestScoringEligibleDrone() {
        DroneBriefVm underpowered = new DroneBriefVm("d-low", "VN-LOW", "DJI", "Mini", "available", DEP_HUB_ID, 200.0, 1.0);
        DroneBriefVm fit = new DroneBriefVm("d-fit", "VN-FIT", "DJI", "M350", "available", DEP_HUB_ID, 700.0, 4.0);

        when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(mission));
        when(waypointRepository.findByMissionIdOrderBySequenceAsc(MISSION_ID)).thenReturn(waypoints);
        when(droneClientService.getAvailableDronesAtHub(DEP_HUB_ID)).thenReturn(List.of(underpowered, fit));

        ScoredDroneCandidateVm best = fleetScoringService.getBestCandidate(MISSION_ID);

        assertThat(best).isNotNull();
        assertThat(best.droneId()).isEqualTo("d-fit");
        assertThat(best.eligible()).isTrue();
    }

    @Test
    @DisplayName("getBestCandidate - when no eligible drones available throws BadRequestException")
    void getBestCandidate_whenNoEligibleDrones_throwsBadRequestException() {
        DroneBriefVm underpowered = new DroneBriefVm("d-low", "VN-LOW", "DJI", "Mini", "available", DEP_HUB_ID, 200.0, 1.0);

        when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(mission));
        when(waypointRepository.findByMissionIdOrderBySequenceAsc(MISSION_ID)).thenReturn(waypoints);
        when(droneClientService.getAvailableDronesAtHub(DEP_HUB_ID)).thenReturn(List.of(underpowered));

        assertThatThrownBy(() -> fleetScoringService.getBestCandidate(MISSION_ID))
                .isInstanceOf(BadRequestException.class);
    }
}

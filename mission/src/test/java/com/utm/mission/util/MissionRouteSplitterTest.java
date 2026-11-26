package com.utm.mission.util;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.mission.model.Mission;
import com.utm.mission.model.Waypoint;
import com.utm.mission.model.enumeration.StopoverType;
import com.utm.mission.model.enumeration.WaypointType;
import com.utm.mission.viewmodel.client.DroneBriefVm;
import com.utm.mission.viewmodel.client.HubBriefVm;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Unit Tests: MissionRouteSplitter (Dijkstra Multi-Hub Bridging & Survey Hub Diversion)")
class MissionRouteSplitterTest {

    @Test
    @DisplayName("planWaypointsWithHubs bridges 85km long-haul route across 3 active Hubs into 4 sequential legs")
    void planWaypointsWithHubs_longHaul85Km_bridgesAcrossThreeHubsIntoFourLegs() {
        HubBriefVm dep = new HubBriefVm("hub-start", "H-START", "Start Vertiport", 10.0000, 106.7000, null);
        HubBriefVm h1 = new HubBriefVm("hub-1", "H-1", "Relay Hub 1", 10.2000, 106.7000, null);
        HubBriefVm h2 = new HubBriefVm("hub-2", "H-2", "Relay Hub 2", 10.4000, 106.7000, null);
        HubBriefVm h3 = new HubBriefVm("hub-3", "H-3", "Relay Hub 3", 10.6000, 106.7000, null);
        HubBriefVm arr = new HubBriefVm("hub-end", "H-END", "Destination Vertiport", 10.7700, 106.7000, null);

        Mission mission = Mission.builder()
                .id("msn-long-85km")
                .departureHubId(dep.id())
                .arrivalHubId(arr.id())
                .payloadWeightKg(2.0)
                .build();

        DroneBriefVm drone = new DroneBriefVm(
                "d-med", "VN-MED-01", "DJI", "FlyCart", "available",
                dep.id(), dep.id(), 240.0, 100.0, 5.0,
                300.0, 240.0, 12.0, 100.0, 12.0, 30, 26000.0, 10.0, 10, List.of());

        List<Waypoint> raw = List.of(
                Waypoint.builder().id("wp-1").sequence(1).name("Climb Point").waypointType(WaypointType.COORDINATE)
                        .latitude(10.0100).longitude(106.7000).altitude(80.0).stopoverType(StopoverType.NONE).build(),
                Waypoint.builder().id("wp-2").sequence(2).name("Approach Point").waypointType(WaypointType.COORDINATE)
                        .latitude(10.7600).longitude(106.7000).altitude(80.0).stopoverType(StopoverType.NONE).build());

        Map<String, HubBriefVm> hubMap = Map.of(dep.id(), dep, arr.id(), arr);
        List<HubBriefVm> activeHubs = List.of(dep, h1, h2, h3, arr);

        MissionRouteSplitter.RoutePlanResult result = MissionRouteSplitter.planWaypointsWithHubs(
                mission, raw, hubMap, activeHubs, drone, StopoverType.RECHARGE, 1.0);

        assertThat(result.insertedHubCount()).isEqualTo(3);
        List<Waypoint> insertedHubs = result.plannedWaypoints().stream()
                .filter(wp -> wp.getWaypointType() == WaypointType.HUB)
                .toList();
        assertThat(insertedHubs).extracting(Waypoint::getHubId)
                .containsExactly("hub-1", "hub-2", "hub-3");
        assertThat(insertedHubs).allSatisfy(wp -> {
            assertThat(wp.getAltitude()).isEqualTo(0.0);
            assertThat(wp.getStopoverType()).isEqualTo(StopoverType.RECHARGE);
            assertThat(wp.getGroundTimeMinutes()).isEqualTo(30);
        });

        List<MissionLegUtils.PlannedLegSpec> legs = MissionLegUtils.decomposeIntoLegs(
                mission, result.plannedWaypoints(), result.enrichedHubMap());
        assertThat(legs).hasSize(4);
        assertThat(legs.get(0).departureHubId()).isEqualTo("hub-start");
        assertThat(legs.get(0).arrivalHubId()).isEqualTo("hub-1");
        assertThat(legs.get(3).departureHubId()).isEqualTo("hub-3");
        assertThat(legs.get(3).arrivalHubId()).isEqualTo("hub-end");
    }

    @Test
    @DisplayName("planWaypointsWithHubs splits 40-waypoint dense survey by diverting to nearest Hub instead of mid-air split")
    void planWaypointsWithHubs_denseSurvey40Waypoints_divertsToNearestHubAndResumes() {
        HubBriefVm baseHub = new HubBriefVm("hub-base", "H-BASE", "Survey Base Hub", 10.7500, 106.7000, null);
        HubBriefVm fieldHub = new HubBriefVm("hub-field", "H-FIELD", "Field Recharge Hub", 10.7700, 106.7200, null);

        Mission mission = Mission.builder()
                .id("msn-survey-40")
                .departureHubId(baseHub.id())
                .arrivalHubId(baseHub.id())
                .payloadWeightKg(1.0)
                .build();

        DroneBriefVm surveyDrone = new DroneBriefVm(
                "d-survey", "VN-SURV-01", "DJI", "M350", "available",
                baseHub.id(), baseHub.id(), 180.0, 100.0, 3.0,
                260.0, 220.0, 10.0, 100.0, 12.0, 25, 18000.0, 5.0, 5, List.of());

        List<Waypoint> gridWaypoints = new ArrayList<>();
        for (int i = 0; i < 40; i++) {
            double lat = 10.7550 + (i % 4) * 0.0060;
            double lon = 106.7050 + (i / 4) * 0.0040;
            gridWaypoints.add(Waypoint.builder()
                    .id("wp-" + (i + 1))
                    .sequence(i + 1)
                    .name("Survey Grid " + (i + 1))
                    .waypointType(WaypointType.COORDINATE)
                    .latitude(lat)
                    .longitude(lon)
                    .altitude(60.0)
                    .hoverDurationSec(10)
                    .stopoverType(StopoverType.NONE)
                    .build());
        }

        MissionRouteSplitter.RoutePlanResult result = MissionRouteSplitter.planWaypointsWithHubs(
                mission,
                gridWaypoints,
                Map.of(baseHub.id(), baseHub),
                List.of(baseHub, fieldHub),
                surveyDrone,
                StopoverType.BATTERY_SWAP,
                1.0);

        assertThat(result.insertedHubCount()).isGreaterThanOrEqualTo(1);
        List<MissionLegUtils.PlannedLegSpec> legs = MissionLegUtils.decomposeIntoLegs(
                mission, result.plannedWaypoints(), result.enrichedHubMap());
        assertThat(legs.size()).isGreaterThanOrEqualTo(2);

        double usableWh = MissionLegUtils.usableBatteryWh(surveyDrone, 100.0);
        for (MissionLegUtils.PlannedLegSpec leg : legs) {
            assertThat(leg.departureHubId()).isNotBlank();
            assertThat(leg.arrivalHubId()).isNotBlank();
            double legEnergy = MissionLegUtils.estimateEnergyWh(
                    leg.distanceMeters(), leg.totalHoverSeconds(), leg.payloadWeightKg(), surveyDrone, 1.0);
            assertThat(legEnergy).isLessThanOrEqualTo(usableWh);
        }

        long preservedCoordinates = result.plannedWaypoints().stream()
                .filter(wp -> wp.getWaypointType() == WaypointType.COORDINATE)
                .count();
        assertThat(preservedCoordinates).isEqualTo(40);
    }

    @Test
    @DisplayName("planWaypointsWithHubs throws MISSION_SEGMENT_EXCEEDS_HUB_NETWORK_RANGE when active hubs cannot bridge gap")
    void planWaypointsWithHubs_disconnectedHubNetwork_throwsBadRequestException() {
        HubBriefVm dep = new HubBriefVm("hub-a", "H-A", "Hub A", 10.0000, 106.0000, null);
        HubBriefVm arr = new HubBriefVm("hub-z", "H-Z", "Hub Z", 12.5000, 108.5000, null);
        Mission mission = Mission.builder()
                .id("msn-unreachable")
                .departureHubId(dep.id())
                .arrivalHubId(arr.id())
                .payloadWeightKg(2.0)
                .build();
        List<Waypoint> raw = List.of(
                Waypoint.builder().sequence(1).name("WP 1").waypointType(WaypointType.COORDINATE)
                        .latitude(10.0100).longitude(106.0100).altitude(50.0).stopoverType(StopoverType.NONE).build(),
                Waypoint.builder().sequence(2).name("WP 2").waypointType(WaypointType.COORDINATE)
                        .latitude(12.4900).longitude(108.4900).altitude(50.0).stopoverType(StopoverType.NONE).build());

        assertThatThrownBy(() -> MissionRouteSplitter.planWaypointsWithHubs(
                mission, raw, Map.of(dep.id(), dep, arr.id(), arr), List.of(dep, arr), null, StopoverType.RECHARGE, 1.0))
                .isInstanceOf(BadRequestException.class)
                .satisfies(ex -> assertThat(((BadRequestException) ex).getErrorCode())
                        .isEqualTo(MessageCode.MISSION_SEGMENT_EXCEEDS_HUB_NETWORK_RANGE));
    }

    @Test
    @DisplayName("buildAnchoredCoordinates creates vertical climb and vertical descent AGL anchors at hub pads")
    void buildAnchoredCoordinates_producesVerticalClimbAndDescent() {
        HubBriefVm dep = new HubBriefVm("hub-a", "H-A", "Hub A", 10.7700, 106.7000, null);
        HubBriefVm arr = new HubBriefVm("hub-b", "H-B", "Hub B", 10.8000, 106.7300, null);
        List<Waypoint> wps = List.of(
                Waypoint.builder().sequence(1).latitude(10.7800).longitude(106.7100).altitude(90.0).build(),
                Waypoint.builder().sequence(2).latitude(10.7900).longitude(106.7200).altitude(60.0).build());

        List<double[]> anchored = MissionLegUtils.buildAnchoredCoordinates(wps, dep, arr);

        assertThat(anchored).hasSize(6);
        assertThat(anchored.get(0)).containsExactly(10.7700, 106.7000, 0.0);
        assertThat(anchored.get(1)).containsExactly(10.7700, 106.7000, 90.0);
        assertThat(anchored.get(2)).containsExactly(10.7800, 106.7100, 90.0);
        assertThat(anchored.get(3)).containsExactly(10.7900, 106.7200, 60.0);
        assertThat(anchored.get(4)).containsExactly(10.8000, 106.7300, 60.0);
        assertThat(anchored.get(5)).containsExactly(10.8000, 106.7300, 0.0);
    }

    @Test
    @DisplayName("calculateCumulativeBatterySegments sums uncharged PAYLOAD_DROPOFF legs and resets after RECHARGE")
    void calculateCumulativeBatterySegments_sumsPayloadDropoffAndResetsAfterRecharge() {
        Mission mission = Mission.builder()
                .id("msn-cum")
                .departureHubId("hub-a")
                .arrivalHubId("hub-d")
                .payloadWeightKg(2.0)
                .build();
        List<Waypoint> wps = List.of(
                Waypoint.builder().sequence(1).latitude(10.7700).longitude(106.7000).altitude(60.0)
                        .waypointType(WaypointType.COORDINATE).stopoverType(StopoverType.NONE).build(),
                Waypoint.builder().sequence(2).latitude(10.7900).longitude(106.7200).altitude(0.0)
                        .waypointType(WaypointType.HUB).hubId("hub-b").stopoverType(StopoverType.PAYLOAD_DROPOFF)
                        .groundTimeMinutes(5).payloadDeltaKg(-1.0).build(),
                Waypoint.builder().sequence(3).latitude(10.8100).longitude(106.7400).altitude(0.0)
                        .waypointType(WaypointType.HUB).hubId("hub-c").stopoverType(StopoverType.RECHARGE)
                        .groundTimeMinutes(30).build(),
                Waypoint.builder().sequence(4).latitude(10.8300).longitude(106.7600).altitude(60.0)
                        .waypointType(WaypointType.COORDINATE).stopoverType(StopoverType.NONE).build());

        Map<String, HubBriefVm> hubs = Map.of(
                "hub-a", new HubBriefVm("hub-a", "A", "A", 10.7650, 106.6950, null),
                "hub-b", new HubBriefVm("hub-b", "B", "B", 10.7900, 106.7200, null),
                "hub-c", new HubBriefVm("hub-c", "C", "C", 10.8100, 106.7400, null),
                "hub-d", new HubBriefVm("hub-d", "D", "D", 10.8350, 106.7650, null));

        List<MissionLegUtils.PlannedLegSpec> legs = MissionLegUtils.decomposeIntoLegs(mission, wps, hubs);
        List<MissionLegUtils.BatteryCycleSegment> segments = MissionLegUtils.calculateCumulativeBatterySegments(legs, null, 1.0);
        Map<Integer, Double> expectedSoC = MissionLegUtils.computeExpectedInitialBatteryPcts(legs, null, 1.0);

        assertThat(segments).hasSize(2);
        assertThat(segments.get(0).legIndices()).containsExactly(0, 1);
        assertThat(segments.get(0).usesInitialBattery()).isTrue();
        assertThat(segments.get(1).legIndices()).containsExactly(2);
        assertThat(segments.get(1).usesInitialBattery()).isFalse();

        assertThat(expectedSoC.get(0)).isEqualTo(100.0);
        assertThat(expectedSoC.get(1)).isLessThan(100.0);
        assertThat(expectedSoC.get(2)).isEqualTo(100.0);
    }

    @Test
    @DisplayName("Direct Hub-to-Hub long-haul mission [DepHub, ArrHub] bridges via Dijkstra keeping terminal HUB endpoints")
    void planWaypointsWithHubs_directTerminalHubsLongHaul_bridgesIntermediateHubsBetweenTerminals() {
        Mission mission = Mission.builder()
                .id("msn-direct-long")
                .departureHubId("hub-0")
                .arrivalHubId("hub-3")
                .payloadWeightKg(1.0)
                .build();

        HubBriefVm h0 = new HubBriefVm("hub-0", "H0", "Origin", 10.7000, 106.7000, null, "active", 6);
        HubBriefVm h1 = new HubBriefVm("hub-1", "H1", "Relay 1", 10.8800, 106.7000, null, "active", 6);
        HubBriefVm h2 = new HubBriefVm("hub-2", "H2", "Relay 2", 11.0600, 106.7000, null, "active", 6);
        HubBriefVm h3 = new HubBriefVm("hub-3", "H3", "Dest", 11.2400, 106.7000, null, "active", 6);

        List<Waypoint> terminalOnly = List.of(
                Waypoint.builder().id("wp-dep").sequence(1).name("Departure: Origin")
                        .waypointType(WaypointType.HUB).hubId("hub-0")
                        .latitude(h0.latitude()).longitude(h0.longitude()).altitude(0.0)
                        .stopoverType(StopoverType.NONE).build(),
                Waypoint.builder().id("wp-arr").sequence(2).name("Arrival: Dest")
                        .waypointType(WaypointType.HUB).hubId("hub-3")
                        .latitude(h3.latitude()).longitude(h3.longitude()).altitude(0.0)
                        .stopoverType(StopoverType.NONE).build());

        DroneBriefVm drone = new DroneBriefVm(
                "d-med", "VN-MED-02", "DJI", "FlyCart", "available",
                h0.id(), h0.id(), 240.0, 100.0, 5.0,
                300.0, 240.0, 12.0, 100.0, 12.0, 30, 26000.0, 10.0, 10, List.of());

        Map<String, HubBriefVm> hubMap = Map.of("hub-0", h0, "hub-3", h3);
        MissionRouteSplitter.RoutePlanResult res = MissionRouteSplitter.planWaypointsWithHubs(
                mission, terminalOnly, hubMap, List.of(h0, h1, h2, h3), drone, StopoverType.RECHARGE, 1.0);

        assertThat(res.insertedHubCount()).isEqualTo(2);
        assertThat(res.plannedWaypoints()).hasSize(4);
        assertThat(res.plannedWaypoints().getFirst().getHubId()).isEqualTo("hub-0");
        assertThat(res.plannedWaypoints().getFirst().getStopoverType()).isEqualTo(StopoverType.NONE);
        assertThat(res.plannedWaypoints().get(1).getHubId()).isEqualTo("hub-1");
        assertThat(res.plannedWaypoints().get(1).getStopoverType()).isEqualTo(StopoverType.RECHARGE);
        assertThat(res.plannedWaypoints().get(2).getHubId()).isEqualTo("hub-2");
        assertThat(res.plannedWaypoints().get(2).getStopoverType()).isEqualTo(StopoverType.RECHARGE);
        assertThat(res.plannedWaypoints().getLast().getHubId()).isEqualTo("hub-3");
        assertThat(res.plannedWaypoints().getLast().getStopoverType()).isEqualTo(StopoverType.NONE);

        List<MissionLegUtils.PlannedLegSpec> legs = MissionLegUtils.decomposeIntoLegs(
                mission, res.plannedWaypoints(), res.enrichedHubMap());
        assertThat(legs).hasSize(3);
    }
}

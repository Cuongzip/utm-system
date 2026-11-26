package com.utm.mission.util;

import com.utm.mission.model.Mission;
import com.utm.mission.model.Waypoint;
import com.utm.mission.model.enumeration.StopoverType;
import com.utm.mission.viewmodel.client.HubBriefVm;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Unit Tests: MissionLegUtils (Multi-Leg Decomposition & Energy)")
class MissionLegUtilsTest {

    @Test
    @DisplayName("decomposeIntoLegs splits mission at RECHARGE and PAYLOAD_DROPOFF stopovers with payload delta tracking")
    void decomposeIntoLegs_twoStopovers_producesThreeLegsWithUpdatedPayloads() {
        Mission mission = Mission.builder()
                .id("mission-multi-1")
                .departureHubId("hub-a")
                .arrivalHubId("hub-d")
                .payloadWeightKg(3.0)
                .build();

        Waypoint wp1 = Waypoint.builder()
                .sequence(1)
                .latitude(10.7700)
                .longitude(106.7000)
                .altitude(60.0)
                .stopoverType(StopoverType.NONE)
                .build();
        Waypoint wp2 = Waypoint.builder()
                .sequence(2)
                .latitude(10.7900)
                .longitude(106.7200)
                .altitude(60.0)
                .hubId("hub-b")
                .stopoverType(StopoverType.RECHARGE)
                .groundTimeMinutes(25)
                .payloadDeltaKg(0.0)
                .build();
        Waypoint wp3 = Waypoint.builder()
                .sequence(3)
                .latitude(10.8100)
                .longitude(106.7400)
                .altitude(60.0)
                .hubId("hub-c")
                .stopoverType(StopoverType.PAYLOAD_DROPOFF)
                .groundTimeMinutes(10)
                .payloadDeltaKg(-1.5)
                .build();
        Waypoint wp4 = Waypoint.builder()
                .sequence(4)
                .latitude(10.8300)
                .longitude(106.7600)
                .altitude(50.0)
                .stopoverType(StopoverType.NONE)
                .build();

        Map<String, HubBriefVm> hubs = Map.of(
                "hub-a", new HubBriefVm("hub-a", "HUB-A", "Hub Alpha", 10.7650, 106.6950, null),
                "hub-b", new HubBriefVm("hub-b", "HUB-B", "Hub Bravo", 10.7900, 106.7200, null),
                "hub-c", new HubBriefVm("hub-c", "HUB-C", "Hub Charlie", 10.8100, 106.7400, null),
                "hub-d", new HubBriefVm("hub-d", "HUB-D", "Hub Delta", 10.8350, 106.7650, null));

        List<MissionLegUtils.PlannedLegSpec> legs = MissionLegUtils.decomposeIntoLegs(
                mission, List.of(wp1, wp2, wp3, wp4), hubs);

        assertThat(legs).hasSize(3);

        assertThat(legs.get(0).legIndex()).isZero();
        assertThat(legs.get(0).departureHubId()).isEqualTo("hub-a");
        assertThat(legs.get(0).arrivalHubId()).isEqualTo("hub-b");
        assertThat(legs.get(0).stopoverType()).isEqualTo(StopoverType.RECHARGE);
        assertThat(legs.get(0).groundTimeMinutes()).isEqualTo(25);
        assertThat(legs.get(0).payloadWeightKg()).isEqualTo(3.0);
        assertThat(legs.get(0).distanceMeters()).isGreaterThan(3000.0);

        assertThat(legs.get(1).legIndex()).isEqualTo(1);
        assertThat(legs.get(1).departureHubId()).isEqualTo("hub-b");
        assertThat(legs.get(1).arrivalHubId()).isEqualTo("hub-c");
        assertThat(legs.get(1).stopoverType()).isEqualTo(StopoverType.PAYLOAD_DROPOFF);
        assertThat(legs.get(1).groundTimeMinutes()).isEqualTo(10);
        assertThat(legs.get(1).payloadWeightKg()).isEqualTo(3.0);

        assertThat(legs.get(2).legIndex()).isEqualTo(2);
        assertThat(legs.get(2).departureHubId()).isEqualTo("hub-c");
        assertThat(legs.get(2).arrivalHubId()).isEqualTo("hub-d");
        assertThat(legs.get(2).stopoverType()).isEqualTo(StopoverType.NONE);
        assertThat(legs.get(2).payloadWeightKg()).isEqualTo(1.5);
    }

    @Test
    @DisplayName("findRecommendedChargingHubs suggests reachable midpoint hub ordered by total detour distance")
    void findRecommendedChargingHubs_returnsClosestReachableMidpoint() {
        HubBriefVm dep = new HubBriefVm("hub-a", "A", "Start", 10.7000, 106.7000, null);
        HubBriefVm arr = new HubBriefVm("hub-z", "Z", "End", 10.9000, 106.7000, null);
        HubBriefVm midDirect = new HubBriefVm("hub-mid-1", "M1", "Mid Direct", 10.8000, 106.7010, null);
        HubBriefVm midDetour = new HubBriefVm("hub-mid-2", "M2", "Mid Detour", 10.8000, 106.7600, null);
        HubBriefVm tooFar = new HubBriefVm("hub-far", "FAR", "Far Hub", 12.0000, 108.0000, null);

        List<HubBriefVm> recommended = MissionLegUtils.findRecommendedChargingHubs(
                dep, arr, 2.0, 120.0, List.of(dep, arr, midDetour, tooFar, midDirect));

        assertThat(recommended).extracting(HubBriefVm::id).containsExactly("hub-mid-1", "hub-mid-2");
    }
}

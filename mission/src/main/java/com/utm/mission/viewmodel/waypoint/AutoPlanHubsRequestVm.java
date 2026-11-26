package com.utm.mission.viewmodel.waypoint;

import com.utm.mission.model.enumeration.StopoverType;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Request payload for automatically planning intermediate HUB stopover waypoints based on battery energy budget")
public record AutoPlanHubsRequestVm(
        @Schema(description = "Optional drone UUID whose real battery/power specs determine split range (defaults to fleet reference specs)")
        String droneId,

        @Schema(description = "Preferred stopover type for auto-inserted HUB waypoints (recharge, battery_swap, relay_handoff; default recharge)")
        StopoverType preferredStopoverType,

        @Schema(description = "Whether to persist inserted HUB waypoints into the draft mission (true) or preview only (false). Defaults to true.")
        Boolean persist
) {
    public AutoPlanHubsRequestVm() {
        this(null, StopoverType.RECHARGE, true);
    }
}

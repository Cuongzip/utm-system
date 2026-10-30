package com.utm.flight.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Flight mission profile parameters for energy calculation")
public record MissionProfileVm(
        double distanceM,
        double hoverTimeS,
        double payloadKg
) {
}

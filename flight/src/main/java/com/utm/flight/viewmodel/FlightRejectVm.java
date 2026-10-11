package com.utm.flight.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Request payload for rejecting a flight by ATC")
public record FlightRejectVm(
        @Schema(description = "Reason for rejection", example = "Airspace congestion or temporary flight restriction")
        String reason
) {
}

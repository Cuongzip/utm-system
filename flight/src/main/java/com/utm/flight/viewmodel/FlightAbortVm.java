package com.utm.flight.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Request payload for aborting or cancelling a flight operation")
public record FlightAbortVm(
        @Schema(description = "Reason for aborting or terminating the flight operation", example = "Severe weather warning / GPS signal degradation")
        String reason
) {
}

package com.utm.mission.viewmodel;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;

@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "Brief profile of created flight plan")
public record FlightBriefVm(
        @Schema(description = "Unique UUID identifier of the flight", example = "550e8400-e29b-41d4-a716-446655440000")
        String id,

        @Schema(description = "Flight number callsign", example = "FL-1728529200")
        String flightNumber,

        @Schema(description = "Assigned drone UUID", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
        String droneId,

        @Schema(description = "Assigned pilot ID", example = "PILOT-VN-007")
        String pilotId,

        @Schema(description = "Flight status", example = "planned")
        String status,

        @Schema(description = "ATC authorization status", example = "pending")
        String authorizationStatus
) {
}

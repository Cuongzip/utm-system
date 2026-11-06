package com.utm.flight.viewmodel.client;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Payload to report an emergency incident from flight service")
public record EmergencyIncidentPostVm(
        @NotBlank String droneId,
        String flightId,
        @NotNull String emergencyType,
        @NotNull String severity,
        @NotBlank String message,
        Object detectionData,
        Double latitude,
        Double longitude,
        Double altitude
) {
}

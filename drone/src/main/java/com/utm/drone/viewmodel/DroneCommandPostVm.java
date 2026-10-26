package com.utm.drone.viewmodel;

import com.utm.drone.model.enumeration.CommandType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Request payload for dispatching a command to a drone")
public record DroneCommandPostVm(
        @Schema(description = "Type of flight / tactical command to issue", example = "RTL", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull(message = "Command type is required")
        CommandType commandType,

        @Schema(description = "Associated flight UUID if command is issued during a mission flight", example = "550e8400-e29b-41d4-a716-446655440000")
        String flightId,

        @Schema(description = "Command parameters in JSON string format (e.g. altitude, speed, coordinates)", example = "{\"returnAltitude\": 80.0, \"speed\": 12.0}")
        String parameters,

        @Schema(description = "Execution priority (0: Critical emergency, 1: High priority, 2: Normal, 3: Background)", example = "1")
        Integer priority,

        @Schema(description = "Timeout in milliseconds waiting for drone acknowledgment", example = "1000")
        Integer timeoutMs
) {
}

package com.utm.drone.viewmodel;

import com.utm.drone.model.enumeration.CommandStatus;
import com.utm.drone.model.enumeration.CommandType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.time.ZonedDateTime;

@Schema(description = "Detailed Drone Command view model")
public record DroneCommandVm(
        @Schema(description = "Unique UUID identifier of the command", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
        String id,

        @Schema(description = "Target drone UUID", example = "96683f5a-769f-44aa-b4d3-16c72f2fe0a4")
        String droneId,

        @Schema(description = "Associated flight UUID if applicable", example = "550e8400-e29b-41d4-a716-446655440000")
        String flightId,

        @Schema(description = "Type of command", example = "RTL")
        CommandType commandType,

        @Schema(description = "Command parameters in JSON string", example = "{\"returnAltitude\": 80.0}")
        String parameters,

        @Schema(description = "Current lifecycle execution status of the command", example = "EXECUTING")
        CommandStatus status,

        @Schema(description = "User ID who issued the command", example = "pilot-01")
        String issuedBy,

        @Schema(description = "Timestamp when the command was issued")
        Instant issuedAt,

        @Schema(description = "Timestamp when the drone acknowledged receipt of command")
        Instant acknowledgedAt,

        @Schema(description = "Timestamp when the command completed or failed")
        Instant completedAt,

        @Schema(description = "Error details if the command failed")
        String errorMessage,

        @Schema(description = "Command execution priority", example = "1")
        Integer priority,

        @Schema(description = "Timeout in milliseconds", example = "1000")
        Integer timeoutMs,

        @Schema(description = "Retry attempts executed", example = "0")
        Integer retryCount,

        @Schema(description = "Maximum retry attempts allowed", example = "2")
        Integer maxRetries,

        @Schema(description = "Record creation timestamp")
        ZonedDateTime createdOn,

        @Schema(description = "Creator username / ID")
        String createdBy,

        @Schema(description = "Last modification timestamp")
        ZonedDateTime lastModifiedOn,

        @Schema(description = "Last modifier username / ID")
        String lastModifiedBy
) {
}

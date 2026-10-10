package com.utm.connectivity.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;

@Schema(description = "Response payload for device heartbeat ping")
public record HeartbeatResultVm(
        @Schema(description = "Heartbeat processing status", example = "true")
        boolean success,

        @Schema(description = "Timestamp when heartbeat was acknowledged", example = "2026-10-10T22:00:00Z")
        ZonedDateTime timestamp
) {
}

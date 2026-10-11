package com.utm.drone.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;

@Schema(description = "Brief summary of hardware device registration and connectivity status")
public record DeviceRegistrationBriefVm(
        @Schema(description = "Device registration record ID", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
        String id,

        @Schema(description = "Unique hardware device identifier (MAC/IMEI)", example = "DRONE-MAC-9876543210AB")
        String deviceIdentifier,

        @Schema(description = "Connection status (online, offline, connecting)", example = "online")
        String connectionStatus,

        @Schema(description = "Timestamp of the last received heartbeat", example = "2026-10-11T09:20:00Z")
        ZonedDateTime lastSeenAt
) {
}

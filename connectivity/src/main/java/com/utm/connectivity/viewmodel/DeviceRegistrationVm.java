package com.utm.connectivity.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;

@Schema(description = "Detailed profile of hardware device registration")
public record DeviceRegistrationVm(
        @Schema(description = "Unique device registration identifier", example = "d94b0870-7615-46eb-811c-2fa23e5927ad")
        String id,

        @Schema(description = "Associated drone UUID", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
        String droneId,

        @Schema(description = "Aircraft registration number", example = "SX-UAS-001")
        String droneRegistrationNumber,

        @Schema(description = "Drone aircraft model", example = "DJI Matrice 350 RTK")
        String droneModel,

        @Schema(description = "Unique hardware device identifier", example = "DRONE-MAC-9876543210AB")
        String deviceIdentifier,

        @Schema(description = "Current connection status", example = "online")
        String connectionStatus,

        @Schema(description = "Current active WebSocket session ID", example = "ws-session-abc-123")
        String socketId,

        @Schema(description = "Hardware certificate fingerprint", example = "SHA256:7b91d24c88f910a3")
        String certificateFingerprint,

        @Schema(description = "Timestamp of the last received heartbeat ping", example = "2026-10-10T22:00:00Z")
        ZonedDateTime lastSeenAt,

        @Schema(description = "Record creation timestamp", example = "2026-10-10T21:00:00Z")
        ZonedDateTime createdOn,

        @Schema(description = "Last modification timestamp", example = "2026-10-10T22:00:00Z")
        ZonedDateTime lastModifiedOn
) {
}

package com.utm.connectivity.viewmodel.device;

import com.utm.connectivity.model.enumeration.DeviceConnectionStatus;
import com.utm.connectivity.model.enumeration.DeviceRegistrationStatus;
import com.utm.connectivity.model.enumeration.DeviceType;
import com.utm.connectivity.model.enumeration.TelemetryMode;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

@Schema(description = "Detailed profile of hardware device registration")
public record DeviceRegistrationVm(
        @Schema(description = "Unique device registration identifier", example = "d94b0870-7615-46eb-811c-2fa23e5927ad")
        String id,

        @Schema(description = "Hardware device type (drone, gateway, gcs)", example = "drone")
        DeviceType deviceType,

        @Schema(description = "Associated drone UUID", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
        String droneId,

        @Schema(description = "Aircraft registration number", example = "SX-UAS-001")
        String droneRegistrationNumber,

        @Schema(description = "Drone aircraft model", example = "DJI Matrice 350 RTK")
        String droneModel,

        @Schema(description = "Associated hub UUID", example = "96683f5a-769f-44aa-b4d3-16c72f2fe0a4")
        String hubId,

        @Schema(description = "Unique hardware device identifier", example = "drone-SX-UAS-001")
        String deviceIdentifier,

        @Schema(description = "Registration lifecycle status (pending, active, revoked)", example = "active")
        DeviceRegistrationStatus registrationStatus,

        @Schema(description = "Current connection status", example = "online")
        DeviceConnectionStatus connectionStatus,

        @Schema(description = "Supported communication protocols")
        List<String> supportedProtocols,

        @Schema(description = "Current active WebSocket session ID", example = "ws-session-abc-123")
        String socketId,

        @Schema(description = "Hardware certificate SHA-256 fingerprint")
        String certificateFingerprint,

        @Schema(description = "Active adaptive telemetry rate mode", example = "normal")
        TelemetryMode telemetryMode,

        @Schema(description = "Reason for current telemetry rate mode", example = "Standard flight")
        String telemetryModeReason,

        @Schema(description = "Device metadata")
        Map<String, Object> metadata,

        @Schema(description = "Timestamp of the last received heartbeat ping", example = "2026-10-10T22:00:00Z")
        ZonedDateTime lastSeenAt,

        @Schema(description = "Record creation timestamp", example = "2026-10-10T21:00:00Z")
        ZonedDateTime createdOn,

        @Schema(description = "Identity that created this registration", example = "admin")
        String createdBy,

        @Schema(description = "Last modification timestamp", example = "2026-10-10T22:00:00Z")
        ZonedDateTime lastModifiedOn,

        @Schema(description = "Identity that last modified this registration", example = "admin")
        String lastModifiedBy
) {
    public DeviceRegistrationVm(
            String id,
            String droneId,
            String droneRegistrationNumber,
            String droneModel,
            String deviceIdentifier,
            DeviceConnectionStatus connectionStatus,
            String socketId,
            String certificateFingerprint,
            ZonedDateTime lastSeenAt,
            ZonedDateTime createdOn,
            ZonedDateTime lastModifiedOn
    ) {
        this(id, DeviceType.DRONE, droneId, droneRegistrationNumber, droneModel, null, deviceIdentifier,
                DeviceRegistrationStatus.ACTIVE, connectionStatus, List.of("rest", "websocket"),
                socketId, certificateFingerprint, TelemetryMode.NORMAL, null, null,
                lastSeenAt, createdOn, null, lastModifiedOn, null);
    }
}

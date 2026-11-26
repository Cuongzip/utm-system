package com.utm.connectivity.viewmodel.device;

import com.utm.connectivity.model.enumeration.DeviceType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

@Schema(description = "Payload to register hardware connectivity device (DRONE, GATEWAY, or GCS)")
public record DeviceRegistrationPostVm(
        @Schema(description = "Device category (drone, gateway, gcs). Defaults to drone when omitted.", example = "drone")
        DeviceType deviceType,

        @Size(max = 36, message = "Drone ID must not exceed 36 characters")
        @Schema(description = "Unique UUID of the drone (required when deviceType is drone)", example = "d1b2c3d4-e5f6-7890-abcd-ef1234567890")
        String droneId,

        @Size(max = 36, message = "Hub ID must not exceed 36 characters")
        @Schema(description = "Unique UUID of the hub (required when deviceType is gateway)", example = "h1b2c3d4-e5f6-7890-abcd-ef1234567890")
        String hubId,

        @Schema(description = "Unique hardware identifier. Auto-generated when omitted.", example = "AA:BB:CC:DD:EE:FF")
        @Size(min = 3, max = 100, message = "Device identifier must be between 3 and 100 characters")
        @Pattern(regexp = "^[A-Za-z0-9_:-]+$", message = "Device identifier must contain only alphanumeric characters, colons, dashes, and underscores")
        String deviceIdentifier,

        @Size(max = 128, message = "Certificate fingerprint must not exceed 128 characters")
        @Schema(description = "Optional X.509 SHA-256 certificate fingerprint", example = "7B91D24C88F910A3")
        String certificateFingerprint,

        @Schema(description = "Supported communication protocols", example = "[\"websocket\", \"mavlink\"]")
        List<String> supportedProtocols,

        @Schema(description = "Optional hardware/firmware metadata")
        Map<String, Object> metadata
) {
    public DeviceRegistrationPostVm(
            String droneId,
            String deviceIdentifier,
            String certificateFingerprint
    ) {
        this(DeviceType.DRONE, droneId, null, deviceIdentifier, certificateFingerprint, null, null);
    }
}

package com.utm.connectivity.viewmodel.device;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Schema(description = "Payload to register drone hardware connectivity device")
public record DeviceRegistrationPostVm(
        @NotBlank(message = "Drone ID must not be blank")
        @Size(max = 36, message = "Drone ID must not exceed 36 characters")
        @Schema(description = "Unique UUID of the drone", example = "d1b2c3d4-e5f6-7890-abcd-ef1234567890")
        String droneId,

        @Schema(description = "Unique hardware identifier (MAC address, IMEI, or serial number). If omitted or blank, a unique identifier will be auto-generated (e.g. DEV-XXXXXXXX).", example = "DRONE-MAC-9876543210AB")
        @Size(min = 3, max = 50, message = "Device identifier must be between 3 and 50 characters")
        @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Device identifier must contain only alphanumeric characters, dashes, and underscores")
        String deviceIdentifier,

        @Size(max = 128, message = "Certificate fingerprint must not exceed 128 characters")
        @Schema(description = "Optional SSL/TLS certificate fingerprint or public key thumbprint", example = "SHA256:7b91d24c88f910a3")
        String certificateFingerprint
) {
}

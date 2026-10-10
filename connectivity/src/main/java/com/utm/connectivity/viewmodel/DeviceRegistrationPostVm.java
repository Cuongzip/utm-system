package com.utm.connectivity.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Payload to register drone hardware connectivity device")
public record DeviceRegistrationPostVm(
        @NotBlank(message = "Drone ID must not be blank")
        @Schema(description = "Unique UUID of the drone", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
        String droneId,

        @NotBlank(message = "Device identifier must not be blank")
        @Schema(description = "Unique hardware identifier (MAC address, IMEI, or serial number)", example = "DRONE-MAC-9876543210AB")
        String deviceIdentifier,

        @Schema(description = "Optional SSL/TLS certificate fingerprint or public key thumbprint", example = "SHA256:7b91d24c88f910a3")
        String certificateFingerprint
) {
}

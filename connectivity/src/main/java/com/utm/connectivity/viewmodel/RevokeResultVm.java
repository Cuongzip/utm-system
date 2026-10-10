package com.utm.connectivity.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Response message after revoking device registration")
public record RevokeResultVm(
        @Schema(description = "Result confirmation message", example = "Device registration revoked successfully")
        String message
) {
}

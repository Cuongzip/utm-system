package com.utm.backofficebff.viewmodel;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Refresh token request payload")
public record RefreshTokenRequestVm(
        @Schema(description = "Valid Refresh Token string", example = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
        @NotBlank(message = "Refresh token cannot be blank")
        @JsonProperty("refresh_token")
        String refreshToken
) {
}


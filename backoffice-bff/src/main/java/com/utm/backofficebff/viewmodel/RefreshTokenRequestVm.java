package com.utm.backofficebff.viewmodel;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

public record RefreshTokenRequestVm(
        @NotBlank(message = "Refresh token cannot be blank")
        @JsonProperty("refresh_token")
        String refreshToken
) {
}

package com.utm.backofficebff.viewmodel;

import com.fasterxml.jackson.annotation.JsonProperty;

public record TokenResponseVm(
        @JsonProperty("access_token")
        String accessToken,

        @JsonProperty("token_type")
        String tokenType,

        @JsonProperty("expires_in")
        Long expiresIn,

        @JsonProperty("refresh_token")
        String refreshToken,

        @JsonProperty("refresh_expires_in")
        Long refreshExpiresIn,

        @JsonProperty("id_token")
        String idToken,

        @JsonProperty("scope")
        String scope,

        @JsonProperty("session_state")
        String sessionState
) {
}

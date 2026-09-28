package com.utm.backofficebff.viewmodel;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Authentication token response payload")
public record TokenResponseVm(
        @Schema(description = "JWT Access Token for Authorization: Bearer <token>", example = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...")
        @JsonProperty("access_token")
        String accessToken,

        @Schema(description = "Token type", example = "Bearer")
        @JsonProperty("token_type")
        String tokenType,

        @Schema(description = "Access token lifespan in seconds", example = "600")
        @JsonProperty("expires_in")
        Long expiresIn,

        @Schema(description = "Refresh Token for session renewal", example = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
        @JsonProperty("refresh_token")
        String refreshToken,

        @Schema(description = "Refresh token lifespan in seconds", example = "1800")
        @JsonProperty("refresh_expires_in")
        Long refreshExpiresIn,

        @Schema(description = "OIDC ID Token containing user identity claims", example = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...")
        @JsonProperty("id_token")
        String idToken,

        @Schema(description = "OAuth2 scope granted", example = "openid email profile")
        @JsonProperty("scope")
        String scope,

        @Schema(description = "Keycloak session state identifier", example = "8ab9e5c4-7294-47b2-850f-04a64d1f2a1b")
        @JsonProperty("session_state")
        String sessionState
) {
}


package com.utm.backofficebff.service;

import com.utm.backofficebff.config.KeycloakPropsConfig;
import com.utm.backofficebff.viewmodel.LoginRequestVm;
import com.utm.backofficebff.viewmodel.RefreshTokenRequestVm;
import com.utm.backofficebff.viewmodel.TokenResponseVm;
import com.utm.commonlibrary.exception.BadRequestException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

@Service
public class AuthServiceImpl implements AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthServiceImpl.class);

    private final RestClient restClient;
    private final KeycloakPropsConfig keycloakPropsConfig;

    public AuthServiceImpl(RestClient restClient, KeycloakPropsConfig keycloakPropsConfig) {
        this.restClient = restClient;
        this.keycloakPropsConfig = keycloakPropsConfig;
    }

    @Override
    public TokenResponseVm login(LoginRequestVm loginRequestVm) {
        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("grant_type", "password");
        formData.add("client_id", keycloakPropsConfig.clientId());
        if (keycloakPropsConfig.clientSecret() != null && !keycloakPropsConfig.clientSecret().isBlank()) {
            formData.add("client_secret", keycloakPropsConfig.clientSecret());
        }
        formData.add("username", loginRequestVm.username());
        formData.add("password", loginRequestVm.password());
        formData.add("scope", "openid");

        return executeTokenRequest(formData, "Invalid username or password");
    }

    @Override
    public TokenResponseVm refreshToken(RefreshTokenRequestVm refreshTokenRequestVm) {
        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("grant_type", "refresh_token");
        formData.add("client_id", keycloakPropsConfig.clientId());
        if (keycloakPropsConfig.clientSecret() != null && !keycloakPropsConfig.clientSecret().isBlank()) {
            formData.add("client_secret", keycloakPropsConfig.clientSecret());
        }
        formData.add("refresh_token", refreshTokenRequestVm.refreshToken());

        return executeTokenRequest(formData, "Invalid or expired refresh token");
    }

    private TokenResponseVm executeTokenRequest(MultiValueMap<String, String> formData, String defaultErrorMessage) {
        try {
            return restClient.post()
                    .uri(keycloakPropsConfig.tokenUrl())
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(formData)
                    .retrieve()
                    .body(TokenResponseVm.class);
        } catch (HttpClientErrorException ex) {
            log.error("Error from Keycloak token endpoint: status={}, body={}", ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new BadRequestException(defaultErrorMessage);
        } catch (Exception ex) {
            log.error("Unexpected error during authentication", ex);
            throw new BadRequestException("Authentication service unavailable: " + ex.getMessage());
        }
    }
}

package com.utm.conflict.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.time.Instant;

@Service
@Slf4j
public class SystemTokenService {

    private final RestClient authRestClient;
    private final String tokenUrl;
    private final String clientId;
    private final String username;
    private final String password;

    private String cachedToken;
    private Instant expiryTime = Instant.MIN;

    public SystemTokenService(
            @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri:http://identity/realms/UTM}") String issuerUri,
            @Value("${utm.system-auth.token-url:}") String customTokenUrl,
            @Value("${utm.system-auth.client-id:swagger-ui}") String clientId,
            @Value("${utm.system-auth.username:admin}") String username,
            @Value("${utm.system-auth.password:admin}") String password
    ) {
        this.authRestClient = RestClient.builder().build();
        this.tokenUrl = (customTokenUrl != null && !customTokenUrl.isBlank())
                ? customTokenUrl
                : issuerUri + "/protocol/openid-connect/token";
        this.clientId = clientId;
        this.username = username;
        this.password = password;
    }

    public synchronized String getSystemToken() {
        if (cachedToken != null && Instant.now().isBefore(expiryTime.minusSeconds(30))) {
            return cachedToken;
        }

        try {
            MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
            formData.add("client_id", clientId);
            formData.add("username", username);
            formData.add("password", password);
            formData.add("grant_type", "password");

            TokenResponse response = authRestClient.post()
                    .uri(tokenUrl)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(formData)
                    .retrieve()
                    .body(TokenResponse.class);

            if (response != null && response.accessToken() != null) {
                this.cachedToken = response.accessToken();
                long expiresIn = response.expiresIn() != null ? response.expiresIn() : 300L;
                this.expiryTime = Instant.now().plusSeconds(expiresIn);
                log.debug("Successfully obtained system auth token, expires in {}s", expiresIn);
                return cachedToken;
            }
        } catch (Exception ex) {
            log.warn("Failed to fetch system token from Keycloak at {}: {}", tokenUrl, ex.getMessage());
        }

        return cachedToken;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record TokenResponse(
            @JsonProperty("access_token") String accessToken,
            @JsonProperty("expires_in") Long expiresIn
    ) {}
}

package com.utm.commonlibrary.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.Instant;

@Service
@Slf4j
public class SystemTokenService {

    private final RestClient authRestClient;
    private final String tokenUrl;
    private final String clientId;
    private final String clientSecret;
    private final String username;
    private final String password;

    private String cachedToken;
    private Instant expiryTime = Instant.MIN;

    @Autowired
    public SystemTokenService(
            @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri:http://identity/realms/UTM}") String issuerUri,
            @Value("${utm.system-auth.token-url:}") String customTokenUrl,
            @Value("${utm.system-auth.client-id:swagger-ui}") String clientId,
            @Value("${utm.system-auth.client-secret:}") String clientSecret,
            @Value("${utm.system-auth.username:admin}") String username,
            @Value("${utm.system-auth.password:${UTM_SYSTEM_AUTH_PASSWORD:Admin123@}}") String password
    ) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.authRestClient = RestClient.builder().requestFactory(factory).build();

        this.tokenUrl = (customTokenUrl != null && !customTokenUrl.isBlank())
                ? customTokenUrl
                : issuerUri + "/protocol/openid-connect/token";
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.username = username;
        this.password = password;
    }

    public SystemTokenService(String issuerUri, String customTokenUrl, String clientId, String username, String password) {
        this(issuerUri, customTokenUrl, clientId, null, username, password);
    }

    public synchronized String getSystemToken() {
        if (cachedToken != null && Instant.now().isBefore(expiryTime.minusSeconds(30))) {
            return cachedToken;
        }

        try {
            MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
            formData.add("client_id", clientId);

            if (clientSecret != null && !clientSecret.isBlank()) {
                formData.add("client_secret", clientSecret);
                formData.add("grant_type", "client_credentials");
            } else {
                formData.add("username", username);
                formData.add("password", password);
                formData.add("grant_type", "password");
            }

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
            log.error("Failed to obtain system auth token from {}: {}", tokenUrl, ex.getMessage());
        }
        return null;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TokenResponse(
            @JsonProperty("access_token") String accessToken,
            @JsonProperty("expires_in") Long expiresIn,
            @JsonProperty("token_type") String tokenType
    ) {}
}

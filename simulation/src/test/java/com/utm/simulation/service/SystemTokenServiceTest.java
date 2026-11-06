package com.utm.simulation.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClient;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: SystemTokenService (Specification-Driven)")
class SystemTokenServiceTest {

    @Mock
    private RestClient restClient;

    @Mock
    private RestClient.RequestBodyUriSpec requestBodyUriSpec;

    @Mock
    private RestClient.RequestBodySpec requestBodySpec;

    @Mock
    private RestClient.ResponseSpec responseSpec;

    private SystemTokenService systemTokenService;

    @BeforeEach
    void setUp() {
        systemTokenService = new SystemTokenService(
                "http://localhost:8080/auth/realms/UTM",
                "http://localhost:8080/auth/realms/UTM/protocol/openid-connect/token",
                "test-client",
                "test-admin",
                "test-secret"
        );
        ReflectionTestUtils.setField(systemTokenService, "authRestClient", restClient);
    }

    @Nested
    @DisplayName("getSystemToken")
    class GetSystemToken {

        @Test
        @DisplayName("whenTokenCachedAndNotExpired_returnsCachedTokenWithoutHttpCall")
        void whenTokenCachedAndNotExpired_returnsCachedTokenWithoutHttpCall() {
            ReflectionTestUtils.setField(systemTokenService, "cachedToken", "cached-jwt-token-123");
            ReflectionTestUtils.setField(systemTokenService, "expiryTime", Instant.now().plusSeconds(600));

            String token = systemTokenService.getSystemToken();

            assertThat(token).isEqualTo("cached-jwt-token-123");
            verify(restClient, never()).post();
        }

        @Test
        @DisplayName("whenHttpFails_returnsCachedOrNullGracefullyWithoutThrowing")
        @SuppressWarnings("unchecked")
        void whenHttpFails_returnsCachedOrNullGracefullyWithoutThrowing() {
            ReflectionTestUtils.setField(systemTokenService, "cachedToken", null);
            ReflectionTestUtils.setField(systemTokenService, "expiryTime", Instant.MIN);

            doReturn(requestBodyUriSpec).when(restClient).post();
            doReturn(requestBodySpec).when(requestBodyUriSpec).uri(anyString());
            doReturn(requestBodySpec).when(requestBodySpec).contentType(any());
            doReturn(requestBodySpec).when(requestBodySpec).body(any(Object.class));
            doReturn(responseSpec).when(requestBodySpec).retrieve();
            org.mockito.Mockito.when(responseSpec.body(any(Class.class)))
                    .thenThrow(new RuntimeException("Keycloak connection refused"));

            String token = systemTokenService.getSystemToken();

            assertThat(token).isNull();
        }
    }
}

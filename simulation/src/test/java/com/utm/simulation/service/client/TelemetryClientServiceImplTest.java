package com.utm.simulation.service.client;

import com.utm.simulation.config.ServiceUrlConfig;
import com.utm.simulation.viewmodel.client.TelemetryPushVm;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClient;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: TelemetryClientServiceImpl (Specification-Driven)")
class TelemetryClientServiceImplTest {

    @Mock
    private RestClient restClient;

    @Mock
    private ServiceUrlConfig serviceUrlConfig;

    @Mock
    private RestClient.RequestBodyUriSpec requestBodyUriSpec;

    @Mock
    private RestClient.RequestBodySpec requestBodySpec;

    @Mock
    private RestClient.ResponseSpec responseSpec;

    @InjectMocks
    private TelemetryClientServiceImpl telemetryClientService;

    @Nested
    @DisplayName("pushTelemetry")
    class PushTelemetry {

        @Test
        @DisplayName("whenTelemetryNull_returnsImmediatelyWithoutHttpCall")
        void whenTelemetryNull_returnsImmediatelyWithoutHttpCall() {
            telemetryClientService.pushTelemetry(null);

            verify(restClient, never()).post();
        }

        @Test
        @DisplayName("whenValidWithBearerToken_attachesAuthorizationHeaderAndPushes")
        void whenValidWithBearerToken_attachesAuthorizationHeaderAndPushes() {
            TelemetryPushVm telemetry = new TelemetryPushVm(
                    "drone-01", "flight-01", 10.7769, 106.7009, 50.0, 15.0, 45.0, 0.0, 0.0, 45.0, 99.0
            );

            when(serviceUrlConfig.telemetry()).thenReturn(new ServiceUrlConfig.TelemetryUrlConfig("http://localhost:8088"));
            doReturn(requestBodyUriSpec).when(restClient).post();
            doReturn(requestBodySpec).when(requestBodyUriSpec).uri(anyString());
            doReturn(requestBodySpec).when(requestBodySpec).contentType(any());
            doReturn(requestBodySpec).when(requestBodySpec).body(telemetry);
            doReturn(requestBodySpec).when(requestBodySpec).header(eq("Authorization"), eq("Bearer sample-token-abc"));
            doReturn(responseSpec).when(requestBodySpec).retrieve();
            doReturn(ResponseEntity.ok().build()).when(responseSpec).toBodilessEntity();

            telemetryClientService.pushTelemetry(telemetry, "Bearer sample-token-abc");

            verify(requestBodySpec).header("Authorization", "Bearer sample-token-abc");
            verify(responseSpec).toBodilessEntity();
        }

        @Test
        @DisplayName("whenHttpCallFails_handlesGracefullyWithoutRethrowing")
        void whenHttpCallFails_handlesGracefullyWithoutRethrowing() {
            TelemetryPushVm telemetry = new TelemetryPushVm(
                    "drone-01", "flight-01", 10.7769, 106.7009, 50.0, 15.0, 45.0, 0.0, 0.0, 45.0, 99.0
            );

            when(serviceUrlConfig.telemetry()).thenReturn(new ServiceUrlConfig.TelemetryUrlConfig("http://localhost:8088"));
            doReturn(requestBodyUriSpec).when(restClient).post();
            doReturn(requestBodySpec).when(requestBodyUriSpec).uri(anyString());
            doReturn(requestBodySpec).when(requestBodySpec).contentType(any());
            doReturn(requestBodySpec).when(requestBodySpec).body(telemetry);
            doReturn(responseSpec).when(requestBodySpec).retrieve();
            when(responseSpec.toBodilessEntity()).thenThrow(new RuntimeException("Connection timeout"));

            telemetryClientService.pushTelemetry(telemetry, null);

            verify(responseSpec).toBodilessEntity();
        }
    }
}


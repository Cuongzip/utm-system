package com.utm.simulation.service.client;

import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.simulation.config.ServiceUrlConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: ConnectivityClientServiceImpl (Specification-Driven)")
class ConnectivityClientServiceImplTest {

    private static final String DEVICE_ID = "DEV-001";

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
    private ConnectivityClientServiceImpl connectivityClientService;

    @Nested
    @DisplayName("sendHeartbeat")
    class SendHeartbeat {

        @Test
        @DisplayName("whenDeviceIdBlank_returnsFalse")
        void whenDeviceIdBlank_returnsFalse() {
            assertThat(connectivityClientService.sendHeartbeat(null)).isFalse();
            assertThat(connectivityClientService.sendHeartbeat("   ")).isFalse();
            verify(restClient, never()).post();
        }

        @Test
        @DisplayName("whenConnectivityUrlNotConfigured_returnsFalse")
        void whenConnectivityUrlNotConfigured_returnsFalse() {
            when(serviceUrlConfig.connectivity()).thenReturn(null);

            boolean result = connectivityClientService.sendHeartbeat(DEVICE_ID);

            assertThat(result).isFalse();
            verify(restClient, never()).post();
        }

        @Test
        @DisplayName("whenHeartbeatSuccessful_returnsTrue")
        void whenHeartbeatSuccessful_returnsTrue() {
            when(serviceUrlConfig.connectivity()).thenReturn(new ServiceUrlConfig.ConnectivityUrlConfig("http://localhost:8085"));
            doReturn(requestBodyUriSpec).when(restClient).post();
            doReturn(requestBodySpec).when(requestBodyUriSpec).uri(anyString());
            doReturn(requestBodySpec).when(requestBodySpec).contentType(any());
            doReturn(requestBodySpec).when(requestBodySpec).body(any(Object.class));
            doReturn(responseSpec).when(requestBodySpec).retrieve();
            doReturn(ResponseEntity.ok().build()).when(responseSpec).toBodilessEntity();

            boolean result = connectivityClientService.sendHeartbeat(DEVICE_ID);

            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("whenDeviceNotFound404_throwsNotFoundException")
        void whenDeviceNotFound404_throwsNotFoundException() {
            when(serviceUrlConfig.connectivity()).thenReturn(new ServiceUrlConfig.ConnectivityUrlConfig("http://localhost:8085"));
            doReturn(requestBodyUriSpec).when(restClient).post();
            doReturn(requestBodySpec).when(requestBodyUriSpec).uri(anyString());
            doReturn(requestBodySpec).when(requestBodySpec).contentType(any());
            doReturn(requestBodySpec).when(requestBodySpec).body(any(Object.class));
            doReturn(responseSpec).when(requestBodySpec).retrieve();
            when(responseSpec.toBodilessEntity()).thenThrow(
                    HttpClientErrorException.create(HttpStatus.NOT_FOUND, "Not Found", HttpHeaders.EMPTY, new byte[0], null)
            );

            assertThatThrownBy(() -> connectivityClientService.sendHeartbeat(DEVICE_ID))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessageContaining(DEVICE_ID);
        }

        @Test
        @DisplayName("whenGenericHttpError_returnsFalseGracefully")
        void whenGenericHttpError_returnsFalseGracefully() {
            when(serviceUrlConfig.connectivity()).thenReturn(new ServiceUrlConfig.ConnectivityUrlConfig("http://localhost:8085"));
            doReturn(requestBodyUriSpec).when(restClient).post();
            doReturn(requestBodySpec).when(requestBodyUriSpec).uri(anyString());
            doReturn(requestBodySpec).when(requestBodySpec).contentType(any());
            doReturn(requestBodySpec).when(requestBodySpec).body(any(Object.class));
            doReturn(responseSpec).when(requestBodySpec).retrieve();
            when(responseSpec.toBodilessEntity()).thenThrow(new RuntimeException("Connection timed out"));

            boolean result = connectivityClientService.sendHeartbeat(DEVICE_ID);

            assertThat(result).isFalse();
        }
    }
}


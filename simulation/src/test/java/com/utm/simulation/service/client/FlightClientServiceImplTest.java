package com.utm.simulation.service.client;

import com.utm.simulation.config.ServiceUrlConfig;
import com.utm.simulation.viewmodel.client.FlightDetailVm;
import com.utm.simulation.viewmodel.client.GeoJsonLineStringVm;
import com.utm.simulation.viewmodel.client.WaypointVm;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestClient;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: FlightClientServiceImpl (Specification-Driven)")
class FlightClientServiceImplTest {

    private static final String FLIGHT_ID = "flight-123-uuid";

    @Mock
    private RestClient restClient;

    @Mock
    private ServiceUrlConfig serviceUrlConfig;

    @Mock
    private RestClient.RequestHeadersUriSpec<?> requestHeadersUriSpec;

    @Mock
    private RestClient.RequestHeadersSpec<?> requestHeadersSpec;

    @Mock
    private RestClient.ResponseSpec responseSpec;

    @InjectMocks
    private FlightClientServiceImpl flightClientService;

    @Nested
    @DisplayName("getFlightDetail")
    class GetFlightDetail {

        @Test
        @DisplayName("whenFlightIdBlank_returnsNull")
        void whenFlightIdBlank_returnsNull() {
            assertThat(flightClientService.getFlightDetail(null)).isNull();
            assertThat(flightClientService.getFlightDetail("   ")).isNull();
            verify(restClient, never()).get();
        }

        @Test
        @DisplayName("whenFlightUrlNotConfigured_returnsNull")
        void whenFlightUrlNotConfigured_returnsNull() {
            when(serviceUrlConfig.flight()).thenReturn(null);

            FlightDetailVm result = flightClientService.getFlightDetail(FLIGHT_ID);

            assertThat(result).isNull();
            verify(restClient, never()).get();
        }

        @Test
        @DisplayName("whenFlightFound_returnsFlightDetailVm")
        void whenFlightFound_returnsFlightDetailVm() {
            when(serviceUrlConfig.flight()).thenReturn(new ServiceUrlConfig.FlightUrlConfig("http://localhost:8081"));
            doReturn(requestHeadersUriSpec).when(restClient).get();
            doReturn(requestHeadersSpec).when(requestHeadersUriSpec).uri(anyString());
            doReturn(responseSpec).when(requestHeadersSpec).retrieve();

            FlightDetailVm detail = new FlightDetailVm(
                    FLIGHT_ID, "FL-001", "drone-01", "hub-1", "hub-2", 50.0, null, 0, Collections.emptyList());
            when(responseSpec.body(FlightDetailVm.class)).thenReturn(detail);

            FlightDetailVm result = flightClientService.getFlightDetail(FLIGHT_ID);

            assertThat(result).isNotNull();
            assertThat(result.id()).isEqualTo(FLIGHT_ID);
            assertThat(result.droneId()).isEqualTo("drone-01");
        }

        @Test
        @DisplayName("whenHttpError_returnsNullGracefully")
        void whenHttpError_returnsNullGracefully() {
            when(serviceUrlConfig.flight()).thenReturn(new ServiceUrlConfig.FlightUrlConfig("http://localhost:8081"));
            doReturn(requestHeadersUriSpec).when(restClient).get();
            doReturn(requestHeadersSpec).when(requestHeadersUriSpec).uri(anyString());
            doReturn(responseSpec).when(requestHeadersSpec).retrieve();
            when(responseSpec.body(FlightDetailVm.class)).thenThrow(new RuntimeException("Connection error"));

            FlightDetailVm result = flightClientService.getFlightDetail(FLIGHT_ID);

            assertThat(result).isNull();
        }
    }

    @Nested
    @DisplayName("getFlightWaypoints")
    class GetFlightWaypoints {

        @Test
        @DisplayName("whenFlightNotFound_returnsEmptyList")
        void whenFlightNotFound_returnsEmptyList() {
            when(serviceUrlConfig.flight()).thenReturn(null);

            List<WaypointVm> waypoints = flightClientService.getFlightWaypoints("unknown-flight");

            assertThat(waypoints).isEmpty();
        }

        @Test
        @DisplayName("whenPlannedRoutePresent_extractsWaypointsFromGeoJson")
        void whenPlannedRoutePresent_extractsWaypointsFromGeoJson() {
            when(serviceUrlConfig.flight()).thenReturn(new ServiceUrlConfig.FlightUrlConfig("http://localhost:8081"));
            doReturn(requestHeadersUriSpec).when(restClient).get();
            doReturn(requestHeadersSpec).when(requestHeadersUriSpec).uri(anyString());
            doReturn(responseSpec).when(requestHeadersSpec).retrieve();

            GeoJsonLineStringVm plannedRoute = new GeoJsonLineStringVm("LineString", List.of(
                    List.of(106.7009, 10.7769, 50.0),
                    List.of(106.7050, 10.7800, 60.0)));
            FlightDetailVm detail = new FlightDetailVm(
                    FLIGHT_ID, "FL-001", "drone-01", "hub-1", "hub-2", 50.0, plannedRoute, 2, Collections.emptyList());
            when(responseSpec.body(FlightDetailVm.class)).thenReturn(detail);

            List<WaypointVm> waypoints = flightClientService.getFlightWaypoints(FLIGHT_ID);

            assertThat(waypoints).hasSize(2);
            assertThat(waypoints.getFirst().lat()).isEqualTo(10.7769);
            assertThat(waypoints.getFirst().lon()).isEqualTo(106.7009);
        }

        @Test
        @DisplayName("whenOnlyWaypointsListPresent_returnsWaypointsList")
        void whenOnlyWaypointsListPresent_returnsWaypointsList() {
            when(serviceUrlConfig.flight()).thenReturn(new ServiceUrlConfig.FlightUrlConfig("http://localhost:8081"));
            doReturn(requestHeadersUriSpec).when(restClient).get();
            doReturn(requestHeadersSpec).when(requestHeadersUriSpec).uri(anyString());
            doReturn(responseSpec).when(requestHeadersSpec).retrieve();

            List<WaypointVm> directWaypoints = List.of(
                    new WaypointVm(10.7769, 106.7009, 50.0),
                    new WaypointVm(10.7800, 106.7050, 60.0));
            FlightDetailVm detail = new FlightDetailVm(
                    FLIGHT_ID, "FL-001", "drone-01", "hub-1", "hub-2", 50.0, null, 2, directWaypoints);
            when(responseSpec.body(FlightDetailVm.class)).thenReturn(detail);

            List<WaypointVm> waypoints = flightClientService.getFlightWaypoints(FLIGHT_ID);

            assertThat(waypoints).hasSize(2);
            assertThat(waypoints.getFirst().lat()).isEqualTo(10.7769);
        }
    }
}

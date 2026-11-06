package com.utm.conflict.service;

import com.utm.conflict.config.ServiceUrlConfig;
import com.utm.conflict.mapper.ConflictDetectionMapper;
import com.utm.conflict.model.Conflict;
import com.utm.conflict.model.enumeration.ConflictSeverity;
import com.utm.conflict.model.enumeration.ConflictStatus;
import com.utm.conflict.model.enumeration.ConflictType;
import com.utm.conflict.repository.ConflictRepository;
import com.utm.conflict.viewmodel.client.AirspaceCheckResponseVm;
import com.utm.conflict.viewmodel.client.FlightBriefVm;
import com.utm.conflict.viewmodel.client.FlightListBriefVm;
import com.utm.conflict.viewmodel.client.TelemetryBriefVm;
import com.utm.conflict.viewmodel.conflict.ConflictScanResultVm;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClient;

import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Unit Tests: ConflictDetectionServiceImpl (Specification-Driven)")
class ConflictDetectionServiceImplTest {

        private static final String FLIGHT_1_ID = "flight-001-uuid";
        private static final String FLIGHT_2_ID = "flight-002-uuid";
        private static final String DRONE_1_ID = "drone-001-uuid";
        private static final String DRONE_2_ID = "drone-002-uuid";
        private static final String HUB_ID = "hub-alpha-uuid";

        @Mock
        private ConflictRepository conflictRepository;

        @Mock
        private ConflictSnapshotService conflictSnapshotService;

        @Mock
        private RestClient restClient;

        @Mock
        private ServiceUrlConfig serviceUrlConfig;

        @Mock
        private ConflictDetectionMapper conflictDetectionMapper;

        @Mock
        private RestClient.RequestHeadersUriSpec<?> requestHeadersUriSpec;

        @Mock
        private RestClient.RequestHeadersSpec<?> requestHeadersSpec;

        @Mock
        private RestClient.ResponseSpec responseSpec;

        @Mock
        private RestClient.RequestBodyUriSpec requestBodyUriSpec;

        @Mock
        private RestClient.RequestBodySpec requestBodySpec;

        @Mock
        private RestClient.ResponseSpec postResponseSpec;

        @InjectMocks
        private ConflictDetectionServiceImpl conflictDetectionService;

        private FlightBriefVm flight1;
        private FlightBriefVm flight2;
        private TelemetryBriefVm telemetry1;
        private TelemetryBriefVm telemetry2;
        private Conflict testConflict;

        @BeforeEach
        void setUp() {
                ReflectionTestUtils.setField(conflictDetectionService, "watchdogEnabled", true);
                ReflectionTestUtils.setField(conflictDetectionService, "horizontalThresholdM", 150.0);
                ReflectionTestUtils.setField(conflictDetectionService, "verticalThresholdM", 30.0);
                ReflectionTestUtils.setField(conflictDetectionService, "criticalHorizontalM", 50.0);
                ReflectionTestUtils.setField(conflictDetectionService, "criticalVerticalM", 15.0);

                when(serviceUrlConfig.flight()).thenReturn("http://localhost:8081");
                when(serviceUrlConfig.telemetry()).thenReturn("http://localhost:8088");
                when(serviceUrlConfig.airspace()).thenReturn("http://localhost:8084");
                when(serviceUrlConfig.alert()).thenReturn("http://localhost:8086");

                when(serviceUrlConfig.getFlightUrl()).thenReturn("http://localhost:8081/flight");
                when(serviceUrlConfig.getTelemetryUrl()).thenReturn("http://localhost:8088/telemetry");
                when(serviceUrlConfig.getAirspaceUrl()).thenReturn("http://localhost:8084/airspace");
                when(serviceUrlConfig.getAlertUrl()).thenReturn("http://localhost:8086/alert");

                doReturn(requestHeadersUriSpec).when(restClient).get();
                doReturn(requestHeadersSpec).when(requestHeadersUriSpec).uri(anyString());
                doReturn(responseSpec).when(requestHeadersSpec).retrieve();

                doReturn(requestBodyUriSpec).when(restClient).post();
                doAnswer(inv -> requestBodySpec).when(requestBodyUriSpec).uri(anyString());
                doAnswer(inv -> requestBodySpec).when(requestBodySpec).contentType(any());
                doAnswer(inv -> requestBodySpec).when(requestBodySpec).body(any(Object.class));
                doAnswer(inv -> postResponseSpec).when(requestBodySpec).retrieve();
                doReturn(ResponseEntity.ok().build()).when(postResponseSpec).toBodilessEntity();

                flight1 = new FlightBriefVm(FLIGHT_1_ID, "FL-001", DRONE_1_ID, HUB_ID);
                flight2 = new FlightBriefVm(FLIGHT_2_ID, "FL-002", DRONE_2_ID, HUB_ID);

                telemetry1 = new TelemetryBriefVm(10.7769, 106.7009, 100.0, 15.0, 0.0);
                telemetry2 = new TelemetryBriefVm(10.7770, 106.7010, 105.0, 15.0, 180.0);

                testConflict = Conflict.builder()
                                .id("conflict-123-uuid")
                                .primaryFlightId(FLIGHT_1_ID)
                                .secondaryFlightId(FLIGHT_2_ID)
                                .status(ConflictStatus.DETECTED)
                                .severity(ConflictSeverity.CRITICAL)
                                .conflictType(ConflictType.LOSS_OF_SEPARATION)
                                .build();
        }

        @Nested
        @DisplayName("scheduledWatchdogScan")
        class ScheduledWatchdogScan {

                @Test
                @DisplayName("whenWatchdogDisabled_doesNotTriggerScan")
                void whenWatchdogDisabled_doesNotTriggerScan() {
                        ReflectionTestUtils.setField(conflictDetectionService, "watchdogEnabled", false);

                        conflictDetectionService.scheduledWatchdogScan();

                        verify(restClient, never()).get();
                }

                @Test
                @DisplayName("whenWatchdogEnabled_triggersScan")
                void whenWatchdogEnabled_triggersScan() {
                        when(responseSpec.body(FlightListBriefVm.class))
                                        .thenReturn(new FlightListBriefVm(Collections.emptyList(), 0));
                        when(conflictDetectionMapper.toScanResultVm(anyInt(), anyInt(), anyInt(), anyInt(), anyInt(),
                                        any()))
                                        .thenReturn(new ConflictScanResultVm(0, 0, 0, 0, 0, ZonedDateTime.now()));

                        conflictDetectionService.scheduledWatchdogScan();

                        verify(restClient).get();
                }

                @Test
                @DisplayName("whenScanThrowsException_handlesGracefullyWithoutRethrowing")
                void whenScanThrowsException_handlesGracefullyWithoutRethrowing() {
                        when(responseSpec.body(FlightListBriefVm.class))
                                        .thenThrow(new RuntimeException("Connection failed"));

                        conflictDetectionService.scheduledWatchdogScan();

                        verify(restClient).get();
                }
        }

        @Nested
        @DisplayName("runConflictScan")
        class RunConflictScan {

                @Test
                @DisplayName("whenNoActiveFlights_returnsEmptyScanResult")
                void whenNoActiveFlights_returnsEmptyScanResult() {
                        when(responseSpec.body(FlightListBriefVm.class))
                                        .thenReturn(new FlightListBriefVm(Collections.emptyList(), 0));
                        ConflictScanResultVm expectedResult = new ConflictScanResultVm(0, 0, 0, 0, 0,
                                        ZonedDateTime.now());
                        when(conflictDetectionMapper.toScanResultVm(anyInt(), anyInt(), anyInt(), anyInt(), anyInt(),
                                        any()))
                                        .thenReturn(expectedResult);

                        ConflictScanResultVm result = conflictDetectionService.runConflictScan();

                        assertThat(result).isNotNull();
                        assertThat(result.activeFlightsCount()).isZero();
                        verify(conflictDetectionMapper).toScanResultVm(eq(0), eq(0), eq(0), eq(0), eq(0), any());
                }

                @Test
                @DisplayName("whenFlightHasNoTelemetry_skipsPairwiseEvaluation")
                void whenFlightHasNoTelemetry_skipsPairwiseEvaluation() {
                        when(responseSpec.body(FlightListBriefVm.class))
                                        .thenReturn(new FlightListBriefVm(List.of(flight1), 1));
                        when(responseSpec.body(TelemetryBriefVm.class)).thenReturn(null);
                        ConflictScanResultVm expectedResult = new ConflictScanResultVm(0, 0, 0, 0, 0,
                                        ZonedDateTime.now());
                        when(conflictDetectionMapper.toScanResultVm(anyInt(), anyInt(), anyInt(), anyInt(), anyInt(),
                                        any()))
                                        .thenReturn(expectedResult);

                        ConflictScanResultVm result = conflictDetectionService.runConflictScan();

                        assertThat(result).isNotNull();
                        assertThat(result.activeFlightsCount()).isZero();
                }

                @Test
                @DisplayName("whenAirspaceBreachDetected_createsSingleFlightConflictAndAlert")
                void whenAirspaceBreachDetected_createsSingleFlightConflictAndAlert() {
                        when(responseSpec.body(FlightListBriefVm.class))
                                        .thenReturn(new FlightListBriefVm(List.of(flight1), 1));
                        when(responseSpec.body(TelemetryBriefVm.class)).thenReturn(telemetry1);
                        when(postResponseSpec.body(AirspaceCheckResponseVm.class))
                                        .thenReturn(new AirspaceCheckResponseVm(false, List.of("Restricted zone")));
                        when(conflictRepository.findByPrimaryFlightIdAndStatusIn(eq(FLIGHT_1_ID), anyList()))
                                        .thenReturn(Collections.emptyList());

                        Conflict singleBreachConflict = Conflict.builder()
                                        .id("single-breach-uuid")
                                        .primaryFlightId(FLIGHT_1_ID)
                                        .conflictType(ConflictType.AIRSPACE_BREACH)
                                        .severity(ConflictSeverity.CRITICAL)
                                        .build();

                        when(conflictDetectionMapper.toSingleFlightConflict(
                                        eq(flight1), eq(ConflictType.AIRSPACE_BREACH), eq(ConflictSeverity.CRITICAL),
                                        any(), any(), any(), any())).thenReturn(singleBreachConflict);
                        when(conflictRepository.save(singleBreachConflict)).thenReturn(singleBreachConflict);

                        ConflictScanResultVm expectedResult = new ConflictScanResultVm(1, 0, 1, 0, 0,
                                        ZonedDateTime.now());
                        when(conflictDetectionMapper.toScanResultVm(anyInt(), anyInt(), anyInt(), anyInt(), anyInt(),
                                        any()))
                                        .thenReturn(expectedResult);

                        ConflictScanResultVm result = conflictDetectionService.runConflictScan();

                        assertThat(result).isNotNull();
                        assertThat(result.newConflictsDetected()).isEqualTo(1);
                        verify(conflictRepository).save(singleBreachConflict);
                        verify(conflictSnapshotService).recordSnapshot(
                                        eq(singleBreachConflict),
                                        eq(telemetry1.latitude()), eq(telemetry1.longitude()),
                                        eq(telemetry1.altitude()),
                                        isNull(), isNull(), isNull(),
                                        eq(0.0), eq(0.0), eq(0), eq(ConflictSeverity.CRITICAL));
                }

                @Test
                @DisplayName("whenAirspaceBreachAlreadyActive_skipsCreatingDuplicateSingleConflict")
                void whenAirspaceBreachAlreadyActive_skipsCreatingDuplicateSingleConflict() {
                        when(responseSpec.body(FlightListBriefVm.class))
                                        .thenReturn(new FlightListBriefVm(List.of(flight1), 1));
                        when(responseSpec.body(TelemetryBriefVm.class)).thenReturn(telemetry1);
                        when(postResponseSpec.body(AirspaceCheckResponseVm.class))
                                        .thenReturn(new AirspaceCheckResponseVm(false, List.of("Zone breach")));

                        Conflict existingSingle = Conflict.builder()
                                        .id("existing-single-uuid")
                                        .primaryFlightId(FLIGHT_1_ID)
                                        .secondaryFlightId(null)
                                        .build();
                        when(conflictRepository.findByPrimaryFlightIdAndStatusIn(eq(FLIGHT_1_ID), anyList()))
                                        .thenReturn(List.of(existingSingle));

                        ConflictScanResultVm expectedResult = new ConflictScanResultVm(1, 0, 0, 0, 0,
                                        ZonedDateTime.now());
                        when(conflictDetectionMapper.toScanResultVm(anyInt(), anyInt(), anyInt(), anyInt(), anyInt(),
                                        any()))
                                        .thenReturn(expectedResult);

                        ConflictScanResultVm result = conflictDetectionService.runConflictScan();

                        assertThat(result).isNotNull();
                        assertThat(result.newConflictsDetected()).isZero();
                        verify(conflictDetectionMapper, never()).toSingleFlightConflict(any(), any(), any(), any(),
                                        any(), any(),
                                        any());
                }

                @Test
                @DisplayName("whenTwoFlightsViolateSeparation_createsNewLossOfSeparationConflict")
                void whenTwoFlightsViolateSeparation_createsNewLossOfSeparationConflict() {
                        when(responseSpec.body(FlightListBriefVm.class))
                                        .thenReturn(new FlightListBriefVm(List.of(flight1, flight2), 2));
                        when(responseSpec.body(TelemetryBriefVm.class)).thenReturn(telemetry1, telemetry2);
                        when(postResponseSpec.body(AirspaceCheckResponseVm.class))
                                        .thenReturn(new AirspaceCheckResponseVm(true, Collections.emptyList()));
                        when(conflictRepository.findActiveBetweenFlights(eq(FLIGHT_1_ID), eq(FLIGHT_2_ID), anyList()))
                                        .thenReturn(Collections.emptyList());

                        when(conflictDetectionMapper.toEntity(
                                        eq(flight1), eq(flight2), any(ConflictType.class), any(ConflictSeverity.class),
                                        eq(HUB_ID), any(), any(), any(), any(), any(), any())).thenReturn(testConflict);
                        when(conflictRepository.save(testConflict)).thenReturn(testConflict);

                        ConflictScanResultVm expectedResult = new ConflictScanResultVm(2, 1, 1, 0, 0,
                                        ZonedDateTime.now());
                        when(conflictDetectionMapper.toScanResultVm(anyInt(), anyInt(), anyInt(), anyInt(), anyInt(),
                                        any()))
                                        .thenReturn(expectedResult);

                        ConflictScanResultVm result = conflictDetectionService.runConflictScan();

                        assertThat(result).isNotNull();
                        assertThat(result.newConflictsDetected()).isEqualTo(1);
                        assertThat(result.evaluatedPairsCount()).isEqualTo(1);
                        verify(conflictRepository).save(testConflict);
                        verify(conflictSnapshotService).recordSnapshot(
                                        eq(testConflict),
                                        eq(telemetry1.latitude()), eq(telemetry1.longitude()),
                                        eq(telemetry1.altitude()),
                                        eq(telemetry2.latitude()), eq(telemetry2.longitude()),
                                        eq(telemetry2.altitude()),
                                        anyDouble(), anyDouble(), anyInt(), any(ConflictSeverity.class));
                }

                @Test
                @DisplayName("whenTwoFlightsViolateSeparationAndConflictActive_updatesSeparation")
                void whenTwoFlightsViolateSeparationAndConflictActive_updatesSeparation() {
                        when(responseSpec.body(FlightListBriefVm.class))
                                        .thenReturn(new FlightListBriefVm(List.of(flight1, flight2), 2));
                        when(responseSpec.body(TelemetryBriefVm.class)).thenReturn(telemetry1, telemetry2);
                        when(postResponseSpec.body(AirspaceCheckResponseVm.class))
                                        .thenReturn(new AirspaceCheckResponseVm(true, Collections.emptyList()));
                        when(conflictRepository.findActiveBetweenFlights(eq(FLIGHT_1_ID), eq(FLIGHT_2_ID), anyList()))
                                        .thenReturn(List.of(testConflict));

                        ConflictScanResultVm expectedResult = new ConflictScanResultVm(2, 1, 0, 1, 0,
                                        ZonedDateTime.now());
                        when(conflictDetectionMapper.toScanResultVm(anyInt(), anyInt(), anyInt(), anyInt(), anyInt(),
                                        any()))
                                        .thenReturn(expectedResult);

                        ConflictScanResultVm result = conflictDetectionService.runConflictScan();

                        assertThat(result).isNotNull();
                        assertThat(result.existingConflictsUpdated()).isEqualTo(1);
                        verify(conflictDetectionMapper).updateSeparation(
                                        eq(testConflict), any(), any(), any(), any(), any(), any(),
                                        any(ConflictSeverity.class));
                        verify(conflictRepository).save(testConflict);
                }

                @Test
                @DisplayName("whenTwoFlightsClearedSafeSeparationBuffer_autoResolvesConflict")
                void whenTwoFlightsClearedSafeSeparationBuffer_autoResolvesConflict() {
                        TelemetryBriefVm farTelemetry2 = new TelemetryBriefVm(10.7900, 106.7200, 100.0, 15.0, 180.0);

                        when(responseSpec.body(FlightListBriefVm.class))
                                        .thenReturn(new FlightListBriefVm(List.of(flight1, flight2), 2));
                        when(responseSpec.body(TelemetryBriefVm.class)).thenReturn(telemetry1, farTelemetry2);
                        when(postResponseSpec.body(AirspaceCheckResponseVm.class))
                                        .thenReturn(new AirspaceCheckResponseVm(true, Collections.emptyList()));
                        when(conflictRepository.findActiveBetweenFlights(eq(FLIGHT_1_ID), eq(FLIGHT_2_ID), anyList()))
                                        .thenReturn(List.of(testConflict));

                        ConflictScanResultVm expectedResult = new ConflictScanResultVm(2, 1, 0, 0, 1,
                                        ZonedDateTime.now());
                        when(conflictDetectionMapper.toScanResultVm(anyInt(), anyInt(), anyInt(), anyInt(), anyInt(),
                                        any()))
                                        .thenReturn(expectedResult);

                        ConflictScanResultVm result = conflictDetectionService.runConflictScan();

                        assertThat(result).isNotNull();
                        assertThat(result.resolvedConflictsCount()).isEqualTo(1);
                        verify(conflictDetectionMapper).resolveConflictAuto(testConflict, "SYSTEM_AUTO");
                        verify(conflictRepository).save(testConflict);
                }
        }
}

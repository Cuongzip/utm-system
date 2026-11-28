package com.utm.conflict.service;

import com.fasterxml.jackson.databind.ObjectMapper;
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
import com.utm.conflict.viewmodel.conflict.StrategicTrajectoryCheckPostVm;
import com.utm.conflict.viewmodel.conflict.StrategicTrajectoryCheckResultVm;
import com.utm.conflict.viewmodel.conflict.StrategicTrajectoryPointVm;
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
        @DisplayName("evaluateLiveTelemetry")
        class EvaluateLiveTelemetry {

                @Test
                @DisplayName("whenIncomingTelemetryNull_doesNothing")
                void whenIncomingTelemetryNull_doesNothing() {
                        conflictDetectionService.evaluateLiveTelemetry(null);

                        verify(restClient, never()).get();
                        verify(restClient, never()).post();
                        verify(conflictRepository, never()).save(any());
                }

                @Test
                @DisplayName("whenIncomingTelemetryMissingCoordinates_doesNothing")
                void whenIncomingTelemetryMissingCoordinates_doesNothing() {
                        TelemetryBriefVm invalid = new TelemetryBriefVm(FLIGHT_1_ID, DRONE_1_ID, null, null, null, 0.0, 0.0);

                        conflictDetectionService.evaluateLiveTelemetry(invalid);

                        verify(restClient, never()).get();
                        verify(conflictRepository, never()).save(any());
                }

                @Test
                @DisplayName("whenAirspaceBreachDetected_createsSingleFlightConflictAndAlerts")
                void whenAirspaceBreachDetected_createsSingleFlightConflictAndAlerts() {
                        TelemetryBriefVm incoming = new TelemetryBriefVm(FLIGHT_1_ID, DRONE_1_ID, 10.7769, 106.7009, 100.0, 15.0, 0.0);
                        when(postResponseSpec.body(AirspaceCheckResponseVm.class))
                                        .thenReturn(new AirspaceCheckResponseVm(false, List.of("ZONE-NFZ-1")));
                        when(conflictRepository.findByPrimaryFlightIdAndStatusIn(eq(FLIGHT_1_ID), anyList()))
                                        .thenReturn(Collections.emptyList());
                        when(conflictDetectionMapper.toLiveSingleFlightConflict(
                                        eq(FLIGHT_1_ID), eq(ConflictType.AIRSPACE_BREACH), eq(ConflictSeverity.CRITICAL),
                                        eq(10.7769), eq(106.7009), eq(100.0), anyString()))
                                        .thenReturn(testConflict);
                        when(conflictRepository.save(testConflict)).thenReturn(testConflict);
                        when(responseSpec.body(FlightListBriefVm.class))
                                        .thenReturn(new FlightListBriefVm(Collections.emptyList(), 0));

                        conflictDetectionService.evaluateLiveTelemetry(incoming);

                        verify(conflictDetectionMapper).toLiveSingleFlightConflict(
                                        eq(FLIGHT_1_ID), eq(ConflictType.AIRSPACE_BREACH), eq(ConflictSeverity.CRITICAL),
                                        eq(10.7769), eq(106.7009), eq(100.0), anyString());
                        verify(conflictRepository).save(testConflict);
                        verify(conflictSnapshotService).recordSnapshot(any(), any(), any(), any(), any(), any(), any(),
                                        anyDouble(), anyDouble(), anyInt(), any());
                }

                @Test
                @DisplayName("whenTwoParallelFlightsMaintainSafeDcpa_doesNotTriggerPredictedConflict")
                void whenTwoParallelFlightsMaintainSafeDcpa_doesNotTriggerPredictedConflict() {
                        TelemetryBriefVm parallel1 = new TelemetryBriefVm(FLIGHT_1_ID, DRONE_1_ID, 10.7769, 106.7009,
                                        100.0, 15.0, 0.0);
                        TelemetryBriefVm parallel2 = new TelemetryBriefVm(FLIGHT_2_ID, DRONE_2_ID, 10.7778, 106.70273,
                                        100.0, 10.0, 0.0);

                        when(postResponseSpec.body(AirspaceCheckResponseVm.class))
                                        .thenReturn(new AirspaceCheckResponseVm(true, Collections.emptyList()));
                        when(responseSpec.body(FlightListBriefVm.class))
                                        .thenReturn(new FlightListBriefVm(List.of(flight1, flight2), 2));
                        when(conflictRepository.findActiveBetweenFlights(eq(FLIGHT_1_ID), eq(FLIGHT_2_ID), anyList()))
                                        .thenReturn(Collections.emptyList());

                        conflictDetectionService.evaluateLiveTelemetry(parallel2);
                        conflictDetectionService.evaluateLiveTelemetry(parallel1);

                        verify(conflictRepository, never()).save(any());
                        verify(conflictDetectionMapper, never()).toLiveEntity(any(), any(), any(), any(), any(), any(),
                                        any(), any(), any(), any(), any());
                }

                @Test
                @DisplayName("whenCorridorFloorWarningDuringAuthorizedTerminalPhase_skipsFalseBreachButFlagsCeilingViolationAsHigh")
                void whenCorridorFloorWarningDuringAuthorizedTerminalPhase_skipsFalseBreachButFlagsCeilingViolationAsHigh()
                                throws Exception {
                        var mapper = new ObjectMapper();
                        var routeNode = mapper.readTree(
                                        "{\"type\":\"LineString\",\"coordinates\":[[106.7009,10.7769,0.0],[106.7009,10.7769,110.0],[106.7350,10.7850,110.0],[106.7350,10.7850,0.0]]}");
                        FlightBriefVm activeFlight = new FlightBriefVm(
                                        FLIGHT_1_ID, "FL-2026-006", DRONE_1_ID, HUB_ID, "hub-bravo-uuid",
                                        "active", 110.0, null, null, routeNode);
                        when(responseSpec.body(FlightListBriefVm.class))
                                        .thenReturn(new FlightListBriefVm(List.of(activeFlight), 1));

                        TelemetryBriefVm landingTelemetry = new TelemetryBriefVm(
                                        FLIGHT_1_ID, DRONE_1_ID, 10.785001, 106.735001, 18.4, 0.0, 75.0, -3.5,
                                        "LANDING");
                        java.util.Map<String, Object> corridorFloorViolation = java.util.Map.of(
                                        "zoneId", "c7352fe9-beb1-48d3-94ff-ae7ce4be0564",
                                        "zoneType", "hub_corridor",
                                        "severity", "warning",
                                        "altitudeFloor", 20.0,
                                        "altitudeCeiling", 150.0,
                                        "reason",
                                        "Point altitude (18.4m) falls below floor limit (20.0m) of zone 'Saigon River Low-Altitude Flight Corridor'");
                        when(postResponseSpec.body(AirspaceCheckResponseVm.class))
                                        .thenReturn(new AirspaceCheckResponseVm(false, List.of(corridorFloorViolation)));
                        when(conflictRepository.findByPrimaryFlightIdAndStatusIn(eq(FLIGHT_1_ID), anyList()))
                                        .thenReturn(Collections.emptyList());

                        conflictDetectionService.evaluateLiveTelemetry(landingTelemetry);

                        verify(conflictRepository, never()).save(any());

                        TelemetryBriefVm overCeilingTelemetry = new TelemetryBriefVm(
                                        FLIGHT_1_ID, DRONE_1_ID, 10.7805, 106.7185, 223.0, 15.0, 75.0, 0.0,
                                        "AUTONOMOUS");
                        java.util.Map<String, Object> ceilingViolation = java.util.Map.of(
                                        "zoneId", "c7352fe9-beb1-48d3-94ff-ae7ce4be0564",
                                        "zoneType", "hub_corridor",
                                        "severity", "warning",
                                        "altitudeFloor", 20.0,
                                        "altitudeCeiling", 150.0,
                                        "reason",
                                        "Point altitude (223.0m) exceeds ceiling limit (150.0m) of zone 'Saigon River Low-Altitude Flight Corridor'");
                        when(postResponseSpec.body(AirspaceCheckResponseVm.class))
                                        .thenReturn(new AirspaceCheckResponseVm(false, List.of(ceilingViolation)));
                        Conflict ceilingConflict = Conflict.builder()
                                        .id("conflict-ceiling-1")
                                        .primaryFlightId(FLIGHT_1_ID)
                                        .conflictType(ConflictType.AIRSPACE_BREACH)
                                        .severity(ConflictSeverity.HIGH)
                                        .build();
                        when(conflictDetectionMapper.toLiveSingleFlightConflict(
                                        eq(FLIGHT_1_ID), eq(ConflictType.AIRSPACE_BREACH), eq(ConflictSeverity.HIGH),
                                        eq(10.7805), eq(106.7185), eq(223.0), anyString()))
                                        .thenReturn(ceilingConflict);
                        when(conflictRepository.save(ceilingConflict)).thenReturn(ceilingConflict);

                        conflictDetectionService.evaluateLiveTelemetry(overCeilingTelemetry);

                        verify(conflictDetectionMapper).toLiveSingleFlightConflict(
                                        eq(FLIGHT_1_ID),
                                        eq(ConflictType.AIRSPACE_BREACH),
                                        eq(ConflictSeverity.HIGH),
                                        eq(10.7805),
                                        eq(106.7185),
                                        eq(223.0),
                                        org.mockito.ArgumentMatchers.contains("exceeds ceiling limit (150.0m)"));
                        verify(conflictRepository).save(ceilingConflict);
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
                                        .conflictType(ConflictType.AIRSPACE_BREACH)
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

        @Nested
        @DisplayName("checkTrajectory4D")
        class CheckTrajectory4D {

                private final ObjectMapper mapper = new ObjectMapper();

                @Test
                @DisplayName("whenIntersectingInSpaceAndTime_reportsStrategicConflict")
                void whenIntersectingInSpaceAndTime_reportsStrategicConflict() throws Exception {
                        ZonedDateTime departure = ZonedDateTime.parse("2026-11-24T09:00:00Z");
                        ZonedDateTime arrival = departure.plusMinutes(5);
                        var otherRoute = mapper.readTree(
                                        "{\"type\":\"LineString\",\"coordinates\":[[106.7000,10.7700,60.0],[106.7100,10.7700,60.0]]}");
                        FlightBriefVm scheduledFlight = new FlightBriefVm(
                                        FLIGHT_2_ID, "FL-SCHED-02", DRONE_2_ID, HUB_ID, "scheduled", 60.0,
                                        departure, arrival, otherRoute);
                        when(responseSpec.body(FlightListBriefVm.class))
                                        .thenReturn(new FlightListBriefVm(List.of(scheduledFlight), 1));

                        StrategicTrajectoryCheckPostVm request = new StrategicTrajectoryCheckPostVm(
                                        List.of(
                                                        new StrategicTrajectoryPointVm(10.7650, 106.7050, 60.0),
                                                        new StrategicTrajectoryPointVm(10.7750, 106.7050, 60.0)),
                                        departure,
                                        arrival,
                                        15.0,
                                        null);

                        StrategicTrajectoryCheckResultVm result = conflictDetectionService.checkTrajectory4D(request);

                        assertThat(result.clear()).isFalse();
                        assertThat(result.evaluatedFlightsCount()).isEqualTo(1);
                        assertThat(result.conflicts()).hasSize(1);
                        assertThat(result.conflicts().getFirst().conflictingFlightId()).isEqualTo(FLIGHT_2_ID);
                        assertThat(result.conflicts().getFirst().horizontalDistanceM()).isLessThan(150.0);
                }

                @Test
                @DisplayName("whenSeparatedVerticallyOrInTime_returnsClearTrue")
                void whenSeparatedVerticallyOrInTime_returnsClearTrue() throws Exception {
                        ZonedDateTime departure = ZonedDateTime.parse("2026-11-24T09:00:00Z");
                        ZonedDateTime arrival = departure.plusMinutes(5);
                        var otherRoute = mapper.readTree(
                                        "{\"type\":\"LineString\",\"coordinates\":[[106.7000,10.7700,110.0],[106.7100,10.7700,110.0]]}");
                        FlightBriefVm scheduledFlight = new FlightBriefVm(
                                        FLIGHT_2_ID, "FL-SCHED-03", DRONE_2_ID, HUB_ID, "authorized", 110.0,
                                        departure, arrival, otherRoute);
                        when(responseSpec.body(FlightListBriefVm.class))
                                        .thenReturn(new FlightListBriefVm(List.of(scheduledFlight), 1));

                        StrategicTrajectoryCheckPostVm request = new StrategicTrajectoryCheckPostVm(
                                        List.of(
                                                        new StrategicTrajectoryPointVm(10.7650, 106.7050, 60.0),
                                                        new StrategicTrajectoryPointVm(10.7750, 106.7050, 60.0)),
                                        departure,
                                        arrival,
                                        15.0,
                                        null);

                        StrategicTrajectoryCheckResultVm result = conflictDetectionService.checkTrajectory4D(request);

                        assertThat(result.clear()).isTrue();
                        assertThat(result.conflicts()).isEmpty();
                }
        }
}

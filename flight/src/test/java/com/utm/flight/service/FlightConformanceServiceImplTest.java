package com.utm.flight.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.flight.mapper.FlightConformanceMapper;
import com.utm.flight.model.Flight;
import com.utm.flight.model.FlightConformance;
import com.utm.flight.model.GeoJsonLineString;
import com.utm.flight.model.enumeration.ConformanceStatus;
import com.utm.flight.model.enumeration.FlightStatus;
import com.utm.flight.repository.FlightConformanceRepository;
import com.utm.flight.repository.FlightRepository;
import com.utm.flight.service.client.ConflictClientService;
import com.utm.flight.service.client.EmergencyClientService;
import com.utm.flight.service.client.TelemetryClientService;
import com.utm.flight.viewmodel.client.TelemetryBriefVm;
import com.utm.flight.viewmodel.flight.FlightConformanceVm;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: FlightConformanceServiceImpl (Specification-Driven)")
class FlightConformanceServiceImplTest {

    @Mock
    private FlightRepository flightRepository;

    @Mock
    private FlightConformanceRepository conformanceRepository;

    @Mock
    private TelemetryClientService telemetryClientService;

    @Mock
    private ConflictClientService conflictClientService;

    @Mock
    private EmergencyClientService emergencyClientService;

    @Mock
    private FlightConformanceMapper conformanceMapper;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private FlightConformanceServiceImpl conformanceService;

    private static final String FLIGHT_ID = "flight-123-uuid";
    private Flight testFlight;
    private FlightConformance testConformance;
    private FlightConformanceVm testConformanceVm;

    @BeforeEach
    void setUp() {
        testFlight = Flight.builder()
                .id(FLIGHT_ID)
                .flightNumber("FL-2026-001")
                .droneId("drone-001")
                .status(FlightStatus.ACTIVE)
                .conformanceStatus(ConformanceStatus.CONFORMANT)
                .cruisingAltitudeM(100.0)
                .plannedRoute(GeoJsonLineString.of(List.of(
                        List.of(106.7009, 10.7769),
                        List.of(106.6598, 10.7554))))
                .build();

        testConformance = FlightConformance.builder()
                .id("conf-001")
                .flight(testFlight)
                .status(ConformanceStatus.CONFORMANT)
                .corridorRadiusM(15.0)
                .altitudeBufferM(10.0)
                .currentLatitude(10.7769)
                .currentLongitude(106.7009)
                .currentAltitude(100.0)
                .build();

        testConformanceVm = new FlightConformanceVm(
                FLIGHT_ID,
                "conformant",
                0.0,
                0.0,
                15.0,
                10.0,
                10.7769,
                106.7009,
                100.0,
                15.0,
                45.0,
                ZonedDateTime.now(),
                ZonedDateTime.now(),
                null,
                ZonedDateTime.now(),
                ZonedDateTime.now()
        );
    }

    @Test
    @DisplayName("getConformance - when existing record found returns mapped VM")
    void getConformance_whenExisting_returnsMappedVm() {
        when(conformanceRepository.findByFlightId(FLIGHT_ID)).thenReturn(Optional.of(testConformance));
        when(conformanceMapper.toVm(testConformance)).thenReturn(testConformanceVm);

        FlightConformanceVm result = conformanceService.getConformance(FLIGHT_ID);

        assertThat(result).isNotNull();
        assertThat(result.flightId()).isEqualTo(FLIGHT_ID);
        assertThat(result.status()).isEqualTo("conformant");
        assertThat(result.corridorRadiusM()).isEqualTo(15.0);
    }

    @Test
    @DisplayName("getConformance - when not yet recorded creates default entity from flight and returns VM")
    void getConformance_whenNotYetRecorded_createsDefaultAndReturnsVm() {
        when(conformanceRepository.findByFlightId(FLIGHT_ID)).thenReturn(Optional.empty());
        when(flightRepository.findById(FLIGHT_ID)).thenReturn(Optional.of(testFlight));
        when(conformanceMapper.toEntity(testFlight)).thenReturn(testConformance);
        when(conformanceMapper.toVm(testConformance)).thenReturn(testConformanceVm);

        FlightConformanceVm result = conformanceService.getConformance(FLIGHT_ID);

        assertThat(result).isNotNull();
        assertThat(result.flightId()).isEqualTo(FLIGHT_ID);
        verify(conformanceMapper).toEntity(testFlight);
    }

    @Test
    @DisplayName("getConformance - when flight not found throws NotFoundException")
    void getConformance_whenFlightNotFound_throwsNotFoundException() {
        when(conformanceRepository.findByFlightId("unknown-flight")).thenReturn(Optional.empty());
        when(flightRepository.findById("unknown-flight")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> conformanceService.getConformance("unknown-flight"))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("evaluateFlightConformance - when flight not found throws NotFoundException")
    void evaluateFlightConformance_whenFlightNotFound_throwsNotFoundException() {
        when(flightRepository.findById("unknown-flight")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> conformanceService.evaluateFlightConformance("unknown-flight"))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("evaluateFlightConformance - when telemetry is empty handles missing telemetry and saves")
    void evaluateFlightConformance_whenTelemetryEmpty_handlesMissingTelemetry() {
        when(flightRepository.findById(FLIGHT_ID)).thenReturn(Optional.of(testFlight));
        when(conformanceRepository.findByFlightId(FLIGHT_ID)).thenReturn(Optional.of(testConformance));
        when(telemetryClientService.getLatestFlightTelemetry(FLIGHT_ID)).thenReturn(Optional.empty());
        when(conformanceRepository.save(testConformance)).thenReturn(testConformance);
        when(conformanceMapper.toVm(testConformance)).thenReturn(testConformanceVm);

        FlightConformanceVm result = conformanceService.evaluateFlightConformance(FLIGHT_ID);

        assertThat(result).isNotNull();
        verify(conformanceRepository).save(testConformance);
    }

    @Test
    @DisplayName("evaluateFlightConformance - when telemetry is on corridor trajectory marks CONFORMANT")
    void evaluateFlightConformance_whenOnCorridor_marksConformant() {
        TelemetryBriefVm telemetry = new TelemetryBriefVm(
                10.7769, 106.7009, 100.0, 15.0, 45.0, 85.0, ZonedDateTime.now()
        );

        when(flightRepository.findById(FLIGHT_ID)).thenReturn(Optional.of(testFlight));
        when(conformanceRepository.findByFlightId(FLIGHT_ID)).thenReturn(Optional.of(testConformance));
        when(telemetryClientService.getLatestFlightTelemetry(FLIGHT_ID)).thenReturn(Optional.of(telemetry));
        when(conformanceRepository.save(testConformance)).thenReturn(testConformance);
        when(conformanceMapper.toVm(testConformance)).thenReturn(testConformanceVm);

        FlightConformanceVm result = conformanceService.evaluateFlightConformance(FLIGHT_ID);

        assertThat(result).isNotNull();
        assertThat(testConformance.getStatus()).isEqualTo(ConformanceStatus.CONFORMANT);
        verify(conformanceRepository).save(testConformance);
    }

    @Test
    @DisplayName("evaluateFlightConformance - when telemetry is late beyond warning timeout marks NON_CONFORMING and triggers C2_LINK_LOST conflict")
    void evaluateFlightConformance_whenTelemetryLate15s_marksNonConformingAndTriggersConflict() {
        TelemetryBriefVm lateTelemetry = new TelemetryBriefVm(
                10.7769, 106.7009, 100.0, 15.0, 45.0, 85.0, ZonedDateTime.now().minusSeconds(15)
        );

        when(flightRepository.findById(FLIGHT_ID)).thenReturn(Optional.of(testFlight));
        when(conformanceRepository.findByFlightId(FLIGHT_ID)).thenReturn(Optional.of(testConformance));
        when(telemetryClientService.getLatestFlightTelemetry(FLIGHT_ID)).thenReturn(Optional.of(lateTelemetry));
        when(conformanceRepository.save(testConformance)).thenReturn(testConformance);
        when(conformanceMapper.toVm(testConformance)).thenReturn(testConformanceVm);

        conformanceService.evaluateFlightConformance(FLIGHT_ID);

        assertThat(testConformance.getStatus()).isEqualTo(ConformanceStatus.NON_CONFORMING);
        verify(conflictClientService).reportConformanceConflict(
                eq(testFlight), eq(testConformance), eq(lateTelemetry), anyString(),
                eq("equipment_failure"), eq("C2_LINK_LOST"));
    }

    @Test
    @DisplayName("evaluateFlightConformance - when telemetry is late beyond contingent timeout marks CONTINGENT and triggers emergency")
    void evaluateFlightConformance_whenTelemetryLate30s_marksContingentAndTriggersEmergency() {
        TelemetryBriefVm lostTelemetry = new TelemetryBriefVm(
                10.7769, 106.7009, 100.0, 15.0, 45.0, 85.0, ZonedDateTime.now().minusSeconds(30)
        );

        when(flightRepository.findById(FLIGHT_ID)).thenReturn(Optional.of(testFlight));
        when(conformanceRepository.findByFlightId(FLIGHT_ID)).thenReturn(Optional.of(testConformance));
        when(telemetryClientService.getLatestFlightTelemetry(FLIGHT_ID)).thenReturn(Optional.of(lostTelemetry));
        when(conformanceRepository.save(testConformance)).thenReturn(testConformance);
        when(conformanceMapper.toVm(testConformance)).thenReturn(testConformanceVm);

        conformanceService.evaluateFlightConformance(FLIGHT_ID);

        assertThat(testConformance.getStatus()).isEqualTo(ConformanceStatus.CONTINGENT);
        verify(conflictClientService).reportConformanceConflict(
                eq(testFlight), eq(testConformance), eq(lostTelemetry), anyString(),
                eq("equipment_failure"), eq("C2_LINK_LOST_CONTINGENT"));
        verify(emergencyClientService).reportIncident(eq(testFlight), eq("signal_lost"), eq("critical"), anyString(), eq(lostTelemetry), any());
    }

    @Test
    @DisplayName("evaluateFlightConformance - when telemetry stream is missing preserves last known coordinates and auto-resolves upon recovery")
    void evaluateFlightConformance_whenMissingTelemetryRecovers_preservesCoordsAndAutoResolvesConflicts() {
        testConformance.setLastTelemetryTime(ZonedDateTime.now().minusSeconds(30));

        when(flightRepository.findById(FLIGHT_ID)).thenReturn(Optional.of(testFlight));
        when(conformanceRepository.findByFlightId(FLIGHT_ID)).thenReturn(Optional.of(testConformance));
        when(telemetryClientService.getLatestFlightTelemetry(FLIGHT_ID)).thenReturn(Optional.empty());
        when(conformanceRepository.save(testConformance)).thenReturn(testConformance);
        when(conformanceMapper.toVm(testConformance)).thenReturn(testConformanceVm);

        conformanceService.evaluateFlightConformance(FLIGHT_ID);

        assertThat(testConformance.getStatus()).isEqualTo(ConformanceStatus.CONTINGENT);
        org.mockito.ArgumentCaptor<TelemetryBriefVm> telCaptor = org.mockito.ArgumentCaptor.forClass(TelemetryBriefVm.class);
        verify(emergencyClientService).reportIncident(
                eq(testFlight), eq("signal_lost"), eq("critical"), anyString(), telCaptor.capture(), any());
        assertThat(telCaptor.getValue().latitude()).isEqualTo(10.7769);
        assertThat(telCaptor.getValue().longitude()).isEqualTo(106.7009);

        TelemetryBriefVm recoveredTelemetry = new TelemetryBriefVm(
                10.7769, 106.7009, 100.0, 15.0, 45.0, 82.0, ZonedDateTime.now()
        );
        when(telemetryClientService.getLatestFlightTelemetry(FLIGHT_ID)).thenReturn(Optional.of(recoveredTelemetry));

        conformanceService.evaluateFlightConformance(FLIGHT_ID);

        assertThat(testConformance.getStatus()).isEqualTo(ConformanceStatus.CONFORMANT);
        verify(conflictClientService).resolveConformanceConflicts(eq(FLIGHT_ID), anyString());
    }

    @Test
    @DisplayName("evaluateFlightConformance - when rapid descent detected marks CONTINGENT and reports emergency")
    void evaluateFlightConformance_whenRapidDescent_marksContingentAndReportsEmergency() {
        testConformance.setCurrentAltitude(120.0);
        testConformance.setLastTelemetryTime(ZonedDateTime.now().minusSeconds(2));

        TelemetryBriefVm fallingTelemetry = new TelemetryBriefVm(
                10.7769, 106.7009, 80.0, 15.0, 45.0, 85.0, ZonedDateTime.now()
        );

        when(flightRepository.findById(FLIGHT_ID)).thenReturn(Optional.of(testFlight));
        when(conformanceRepository.findByFlightId(FLIGHT_ID)).thenReturn(Optional.of(testConformance));
        when(telemetryClientService.getLatestFlightTelemetry(FLIGHT_ID)).thenReturn(Optional.of(fallingTelemetry));
        when(conformanceRepository.save(testConformance)).thenReturn(testConformance);
        when(conformanceMapper.toVm(testConformance)).thenReturn(testConformanceVm);

        conformanceService.evaluateFlightConformance(FLIGHT_ID);

        assertThat(testConformance.getStatus()).isEqualTo(ConformanceStatus.CONTINGENT);
        verify(emergencyClientService).reportIncident(eq(testFlight), eq("motor_failure"), eq("critical"), anyString(), eq(fallingTelemetry), any());
    }

    @Test
    @DisplayName("evaluateFlightConformance - when battery is critical under 10% marks CONTINGENT and reports emergency")
    void evaluateFlightConformance_whenBatteryCritical_marksContingent() {
        TelemetryBriefVm criticalBatteryTelemetry = new TelemetryBriefVm(
                10.7769, 106.7009, 100.0, 15.0, 45.0, 8.0, ZonedDateTime.now()
        );

        when(flightRepository.findById(FLIGHT_ID)).thenReturn(Optional.of(testFlight));
        when(conformanceRepository.findByFlightId(FLIGHT_ID)).thenReturn(Optional.of(testConformance));
        when(telemetryClientService.getLatestFlightTelemetry(FLIGHT_ID)).thenReturn(Optional.of(criticalBatteryTelemetry));
        when(conformanceRepository.save(testConformance)).thenReturn(testConformance);
        when(conformanceMapper.toVm(testConformance)).thenReturn(testConformanceVm);

        conformanceService.evaluateFlightConformance(FLIGHT_ID);

        assertThat(testConformance.getStatus()).isEqualTo(ConformanceStatus.CONTINGENT);
        verify(emergencyClientService).reportIncident(eq(testFlight), eq("battery_critical"), eq("critical"), anyString(), eq(criticalBatteryTelemetry), any());
    }

    @Test
    @DisplayName("evaluateFlightConformance - when battery is low under 20% marks NON_CONFORMING")
    void evaluateFlightConformance_whenBatteryLow_marksNonConforming() {
        testConformance.setStatus(ConformanceStatus.CONFORMANT);
        TelemetryBriefVm lowBatteryTelemetry = new TelemetryBriefVm(
                10.7769, 106.7009, 100.0, 15.0, 45.0, 18.0, ZonedDateTime.now()
        );

        when(flightRepository.findById(FLIGHT_ID)).thenReturn(Optional.of(testFlight));
        when(conformanceRepository.findByFlightId(FLIGHT_ID)).thenReturn(Optional.of(testConformance));
        when(telemetryClientService.getLatestFlightTelemetry(FLIGHT_ID)).thenReturn(Optional.of(lowBatteryTelemetry));
        when(conformanceRepository.save(testConformance)).thenReturn(testConformance);
        when(conformanceMapper.toVm(testConformance)).thenReturn(testConformanceVm);

        conformanceService.evaluateFlightConformance(FLIGHT_ID);

        assertThat(testConformance.getStatus()).isEqualTo(ConformanceStatus.NON_CONFORMING);
        verify(emergencyClientService).reportIncident(eq(testFlight), eq("battery_low"), eq("warning"), anyString(), eq(lowBatteryTelemetry), any());
    }

    @Test
    @DisplayName("checkActiveFlightsConformance - when no active flights exists does nothing")
    void checkActiveFlightsConformance_whenNoActiveFlights_doesNothing() {
        when(flightRepository.findByStatus(FlightStatus.ACTIVE)).thenReturn(List.of());

        conformanceService.checkActiveFlightsConformance();

        verify(telemetryClientService, never()).getLatestFlightTelemetry(any());
    }

    @Test
    @DisplayName("checkActiveFlightsConformance - when active flights exist triggers evaluation for each")
    void checkActiveFlightsConformance_whenActiveFlightsExist_evaluatesEachFlight() {
        when(flightRepository.findByStatus(FlightStatus.ACTIVE)).thenReturn(List.of(testFlight));
        when(conformanceRepository.findByFlightId(FLIGHT_ID)).thenReturn(Optional.of(testConformance));
        when(telemetryClientService.getLatestFlightTelemetry(FLIGHT_ID)).thenReturn(Optional.empty());
        when(conformanceRepository.save(testConformance)).thenReturn(testConformance);

        conformanceService.checkActiveFlightsConformance();

        verify(telemetryClientService).getLatestFlightTelemetry(FLIGHT_ID);
        verify(conformanceRepository).save(testConformance);
    }

    @Test
    @DisplayName("evaluateFlightConformance - when drone is behind segment start computes distance to start waypoint accurately")
    void evaluateFlightConformance_whenBehindSegmentStart_computesDistanceToStartWaypoint() {
        TelemetryBriefVm behindStartTelemetry = new TelemetryBriefVm(
                10.7779, 106.7019, 100.0, 10.0, 225.0, 85.0, ZonedDateTime.now()
        );

        when(flightRepository.findById(FLIGHT_ID)).thenReturn(Optional.of(testFlight));
        when(conformanceRepository.findByFlightId(FLIGHT_ID)).thenReturn(Optional.of(testConformance));
        when(telemetryClientService.getLatestFlightTelemetry(FLIGHT_ID)).thenReturn(Optional.of(behindStartTelemetry));
        when(conformanceRepository.save(testConformance)).thenReturn(testConformance);
        when(conformanceMapper.toVm(testConformance)).thenReturn(testConformanceVm);

        conformanceService.evaluateFlightConformance(FLIGHT_ID);

        assertThat(testConformance.getCrossTrackErrorM()).isGreaterThan(100.0);
        assertThat(testConformance.getStatus()).isEqualTo(ConformanceStatus.CONTINGENT);
    }

    @Test
    @DisplayName("evaluateFlightConformance - when telemetry coordinates are null skips spatial calculation safely")
    void evaluateFlightConformance_whenTelemetryCoordinatesNull_doesNotThrowNullPointerException() {
        TelemetryBriefVm nullCoordTelemetry = new TelemetryBriefVm(
                null, null, null, 0.0, 0.0, 85.0, ZonedDateTime.now()
        );

        when(flightRepository.findById(FLIGHT_ID)).thenReturn(Optional.of(testFlight));
        when(conformanceRepository.findByFlightId(FLIGHT_ID)).thenReturn(Optional.of(testConformance));
        when(telemetryClientService.getLatestFlightTelemetry(FLIGHT_ID)).thenReturn(Optional.of(nullCoordTelemetry));
        when(conformanceRepository.save(testConformance)).thenReturn(testConformance);
        when(conformanceMapper.toVm(testConformance)).thenReturn(testConformanceVm);

        FlightConformanceVm result = conformanceService.evaluateFlightConformance(FLIGHT_ID);

        assertThat(result).isNotNull();
        verify(conformanceRepository).save(testConformance);
    }

    @Test
    @DisplayName("evaluateFlightConformance - reports distinct emergency types even when flight is already CONTINGENT")
    void evaluateFlightConformance_consecutiveDistinctEmergencies_reportsBoth() {
        TelemetryBriefVm deviatedTelemetry = new TelemetryBriefVm(
                10.7790, 106.7040, 100.0, 15.0, 45.0, 80.0, ZonedDateTime.now()
        );

        when(flightRepository.findById(FLIGHT_ID)).thenReturn(Optional.of(testFlight));
        when(conformanceRepository.findByFlightId(FLIGHT_ID)).thenReturn(Optional.of(testConformance));
        when(telemetryClientService.getLatestFlightTelemetry(FLIGHT_ID)).thenReturn(Optional.of(deviatedTelemetry));
        when(conformanceRepository.save(testConformance)).thenReturn(testConformance);
        when(conformanceMapper.toVm(testConformance)).thenReturn(testConformanceVm);

        conformanceService.evaluateFlightConformance(FLIGHT_ID);
        assertThat(testConformance.getStatus()).isEqualTo(ConformanceStatus.CONTINGENT);

        testConformance.setCurrentAltitude(100.0);
        testConformance.setLastTelemetryTime(ZonedDateTime.now().minusSeconds(2));
        TelemetryBriefVm fallingTelemetry = new TelemetryBriefVm(
                10.7790, 106.7040, 70.0, 10.0, 45.0, 75.0, ZonedDateTime.now()
        );
        when(telemetryClientService.getLatestFlightTelemetry(FLIGHT_ID)).thenReturn(Optional.of(fallingTelemetry));

        conformanceService.evaluateFlightConformance(FLIGHT_ID);

        verify(emergencyClientService).reportIncident(eq(testFlight), eq("geofence_breach"), eq("critical"),
                anyString(), eq(deviatedTelemetry), any());
        verify(emergencyClientService).reportIncident(eq(testFlight), eq("motor_failure"), eq("critical"),
                anyString(), eq(fallingTelemetry), any());
    }

    @Test
    @DisplayName("violationsToJson - supports both structured object maps and plain string violation entries")
    void violationsToJson_supportsStructuredObjectsAndStrings() {
        FlightConformanceMapper realMapper = org.mapstruct.factory.Mappers.getMapper(FlightConformanceMapper.class);
        List<Object> mixed = List.of(
                java.util.Map.of("type", "CORRIDOR_BREACH", "axis", "LATERAL", "deviationM", 22.5),
                "Vertical deviation 14.0m exceeds altitude buffer 10.0m"
        );
        String json = realMapper.violationsToJson(mixed);
        assertThat(json).contains("CORRIDOR_BREACH").contains("Vertical deviation 14.0m");
    }
}

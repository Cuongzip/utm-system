package com.utm.flight.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.flight.mapper.FlightConformanceMapper;
import com.utm.flight.model.Flight;
import com.utm.flight.model.FlightConformance;
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
                .conformanceStatus(ConformanceStatus.CONFORMING)
                .cruisingAltitudeM(100.0)
                .plannedRoute("{\"type\":\"LineString\",\"coordinates\":[[106.7009,10.7769],[106.6598,10.7554]]}")
                .build();

        testConformance = FlightConformance.builder()
                .id("conf-001")
                .flight(testFlight)
                .status(ConformanceStatus.CONFORMING)
                .corridorRadiusM(15.0)
                .altitudeBufferM(10.0)
                .currentLatitude(10.7769)
                .currentLongitude(106.7009)
                .currentAltitude(100.0)
                .build();

        testConformanceVm = new FlightConformanceVm(
                FLIGHT_ID,
                "conforming",
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
        assertThat(result.status()).isEqualTo("conforming");
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
    @DisplayName("evaluateFlightConformance - when telemetry is late beyond 30s marks NON_CONFORMING and triggers conflict")
    void evaluateFlightConformance_whenTelemetryLate35s_marksNonConformingAndTriggersConflict() {
        TelemetryBriefVm lateTelemetry = new TelemetryBriefVm(
                10.7769, 106.7009, 100.0, 15.0, 45.0, 85.0, ZonedDateTime.now().minusSeconds(40)
        );

        when(flightRepository.findById(FLIGHT_ID)).thenReturn(Optional.of(testFlight));
        when(conformanceRepository.findByFlightId(FLIGHT_ID)).thenReturn(Optional.of(testConformance));
        when(telemetryClientService.getLatestFlightTelemetry(FLIGHT_ID)).thenReturn(Optional.of(lateTelemetry));
        when(conformanceRepository.save(testConformance)).thenReturn(testConformance);
        when(conformanceMapper.toVm(testConformance)).thenReturn(testConformanceVm);

        conformanceService.evaluateFlightConformance(FLIGHT_ID);

        assertThat(testConformance.getStatus()).isEqualTo(ConformanceStatus.NON_CONFORMING);
        verify(conflictClientService).reportConformanceConflict(eq(testFlight), eq(testConformance), eq(lateTelemetry), anyString());
    }

    @Test
    @DisplayName("evaluateFlightConformance - when telemetry is late beyond 90s marks CONTINGENT and triggers emergency")
    void evaluateFlightConformance_whenTelemetryLate100s_marksContingentAndTriggersEmergency() {
        TelemetryBriefVm lostTelemetry = new TelemetryBriefVm(
                10.7769, 106.7009, 100.0, 15.0, 45.0, 85.0, ZonedDateTime.now().minusSeconds(100)
        );

        when(flightRepository.findById(FLIGHT_ID)).thenReturn(Optional.of(testFlight));
        when(conformanceRepository.findByFlightId(FLIGHT_ID)).thenReturn(Optional.of(testConformance));
        when(telemetryClientService.getLatestFlightTelemetry(FLIGHT_ID)).thenReturn(Optional.of(lostTelemetry));
        when(conformanceRepository.save(testConformance)).thenReturn(testConformance);
        when(conformanceMapper.toVm(testConformance)).thenReturn(testConformanceVm);

        conformanceService.evaluateFlightConformance(FLIGHT_ID);

        assertThat(testConformance.getStatus()).isEqualTo(ConformanceStatus.CONTINGENT);
        verify(emergencyClientService).reportIncident(eq(testFlight), eq("signal_lost"), eq("critical"), anyString(), eq(lostTelemetry), any());
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
}

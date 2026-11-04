package com.utm.flight.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.flight.mapper.FeasibilityMapper;
import com.utm.flight.mapper.FlightMapper;
import com.utm.flight.model.Flight;
import com.utm.flight.model.enumeration.FlightAuthorizationStatus;
import com.utm.flight.model.enumeration.FlightStatus;
import com.utm.flight.model.enumeration.Verdict;
import com.utm.flight.repository.FeasibilityEvaluationRepository;
import com.utm.flight.repository.FlightRepository;
import com.utm.flight.service.client.DroneClientService;
import com.utm.flight.viewmodel.feasibility.FeasibilityOverridePostVm;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FeasibilityServiceImplTest {

    @Mock
    private FlightRepository flightRepository;

    @Mock
    private FeasibilityEvaluationRepository evaluationRepository;

    @Mock
    private EnergyModelService energyModelService;

    @Mock
    private DroneClientService droneClientService;

    @Mock
    private FeasibilityMapper feasibilityMapper;

    @Mock
    private FlightMapper flightMapper;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private FeasibilityServiceImpl feasibilityService;

    private Flight testFlight;

    @BeforeEach
    void setUp() {
        testFlight = Flight.builder()
                .id("flight-123")
                .flightNumber("FL-001")
                .status(FlightStatus.SCHEDULED)
                .authorizationStatus(FlightAuthorizationStatus.PENDING)
                .feasibilityVerdict(Verdict.NO_GO)
                .build();
    }

    @Test
    @DisplayName("Should successfully apply feasibility override and transition flight to AUTHORIZED / APPROVED")
    void overrideFeasibility_success() {
        when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));
        when(flightRepository.save(any(Flight.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FeasibilityOverridePostVm request = new FeasibilityOverridePostVm("Medical transport urgent", "ATC Officer Smith");
        feasibilityService.overrideFeasibility("flight-123", request);

        assertThat(testFlight.getFeasibilityOverride()).isEqualTo("Override by ATC Officer Smith: Medical transport urgent");
        assertThat(testFlight.getAuthorizationStatus()).isEqualTo(FlightAuthorizationStatus.APPROVED);
        assertThat(testFlight.getStatus()).isEqualTo(FlightStatus.AUTHORIZED);
        verify(flightRepository).save(testFlight);
    }

    @Test
    @DisplayName("Should throw when overriding feasibility for COMPLETED flight")
    void overrideFeasibility_completed_throws() {
        testFlight.setStatus(FlightStatus.COMPLETED);
        when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));

        FeasibilityOverridePostVm request = new FeasibilityOverridePostVm("Reason", "Admin");
        assertThatThrownBy(() -> feasibilityService.overrideFeasibility("flight-123", request))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("Should throw when overriding feasibility for CANCELLED flight")
    void overrideFeasibility_cancelled_throws() {
        testFlight.setStatus(FlightStatus.CANCELLED);
        when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));

        FeasibilityOverridePostVm request = new FeasibilityOverridePostVm("Reason", "Admin");
        assertThatThrownBy(() -> feasibilityService.overrideFeasibility("flight-123", request))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("Should throw when overriding feasibility for EMERGENCY_LANDING flight")
    void overrideFeasibility_emergencyLanding_throws() {
        testFlight.setStatus(FlightStatus.EMERGENCY_LANDING);
        when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));

        FeasibilityOverridePostVm request = new FeasibilityOverridePostVm("Reason", "Admin");
        assertThatThrownBy(() -> feasibilityService.overrideFeasibility("flight-123", request))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("Should throw when overriding feasibility for ACTIVE flight")
    void overrideFeasibility_active_throws() {
        testFlight.setStatus(FlightStatus.ACTIVE);
        when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));

        FeasibilityOverridePostVm request = new FeasibilityOverridePostVm("Reason", "Admin");
        assertThatThrownBy(() -> feasibilityService.overrideFeasibility("flight-123", request))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("Should throw when overriding feasibility for DIVERTED flight")
    void overrideFeasibility_diverted_throws() {
        testFlight.setStatus(FlightStatus.DIVERTED);
        when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));

        FeasibilityOverridePostVm request = new FeasibilityOverridePostVm("Reason", "Admin");
        assertThatThrownBy(() -> feasibilityService.overrideFeasibility("flight-123", request))
                .isInstanceOf(BadRequestException.class);
    }
}

package com.utm.flight.service;

import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.flight.mapper.FlightMapper;
import com.utm.flight.model.Flight;
import com.utm.flight.model.enumeration.FlightAuthorizationStatus;
import com.utm.flight.model.enumeration.FlightStatus;
import com.utm.flight.model.enumeration.Verdict;
import com.utm.flight.repository.FlightRepository;
import com.utm.flight.service.client.DroneClientService;
import com.utm.flight.service.client.HubClientService;
import com.utm.flight.viewmodel.flight.FlightAbortVm;
import com.utm.flight.viewmodel.flight.FlightPutVm;
import com.utm.flight.viewmodel.flight.FlightRejectVm;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.ZonedDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FlightServiceImplTest {

    @Mock
    private FlightRepository flightRepository;

    @Mock
    private FlightMapper flightMapper;

    @Mock
    private DroneClientService droneClientService;

    @Mock
    private HubClientService hubClientService;

    @InjectMocks
    private FlightServiceImpl flightService;

    private Flight testFlight;

    @BeforeEach
    void setUp() {
        testFlight = Flight.builder()
                .id("flight-123")
                .flightNumber("FL-001")
                .droneId("drone-123")
                .departureHubId("hub-dep")
                .arrivalHubId("hub-arr")
                .scheduledDeparture(ZonedDateTime.now().plusHours(1))
                .scheduledArrival(ZonedDateTime.now().plusHours(2))
                .status(FlightStatus.SCHEDULED)
                .authorizationStatus(FlightAuthorizationStatus.PENDING)
                .feasibilityVerdict(Verdict.GO)
                .build();
    }

    @Nested
    @DisplayName("authorizeFlight")
    class AuthorizeFlightTests {

        @Test
        @DisplayName("Should successfully authorize flight in SCHEDULED status with PENDING authorization")
        void authorizeFlight_success() {
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));
            when(flightRepository.saveAndFlush(any(Flight.class))).thenAnswer(invocation -> invocation.getArgument(0));

            flightService.authorizeFlight("flight-123");

            assertThat(testFlight.getStatus()).isEqualTo(FlightStatus.AUTHORIZED);
            assertThat(testFlight.getAuthorizationStatus()).isEqualTo(FlightAuthorizationStatus.APPROVED);
            verify(flightRepository).saveAndFlush(testFlight);
        }

        @Test
        @DisplayName("Should throw when flight is not in PLANNED or SCHEDULED status")
        void authorizeFlight_invalidStatus_throws() {
            testFlight.setStatus(FlightStatus.ACTIVE);
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));

            assertThatThrownBy(() -> flightService.authorizeFlight("flight-123"))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Should throw when flight authorization is not PENDING")
        void authorizeFlight_notPendingAuthorization_throws() {
            testFlight.setAuthorizationStatus(FlightAuthorizationStatus.APPROVED);
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));

            assertThatThrownBy(() -> flightService.authorizeFlight("flight-123"))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Should throw when feasibility is NO_GO and no override provided")
        void authorizeFlight_noGoWithoutOverride_throws() {
            testFlight.setFeasibilityVerdict(Verdict.NO_GO);
            testFlight.setFeasibilityOverride(null);
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));

            assertThatThrownBy(() -> flightService.authorizeFlight("flight-123"))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Should succeed when feasibility is NO_GO but approved override is present")
        void authorizeFlight_noGoWithOverride_success() {
            testFlight.setFeasibilityVerdict(Verdict.NO_GO);
            testFlight.setFeasibilityOverride("Override by ATC Admin: Safe conditions verified");
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));
            when(flightRepository.saveAndFlush(any(Flight.class))).thenAnswer(invocation -> invocation.getArgument(0));

            flightService.authorizeFlight("flight-123");

            assertThat(testFlight.getStatus()).isEqualTo(FlightStatus.AUTHORIZED);
            assertThat(testFlight.getAuthorizationStatus()).isEqualTo(FlightAuthorizationStatus.APPROVED);
            verify(flightRepository).saveAndFlush(testFlight);
        }
    }

    @Nested
    @DisplayName("rejectFlight")
    class RejectFlightTests {

        @Test
        @DisplayName("Should successfully reject flight and update notes")
        void rejectFlight_success() {
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));
            when(flightRepository.saveAndFlush(any(Flight.class))).thenAnswer(invocation -> invocation.getArgument(0));

            FlightRejectVm rejectVm = new FlightRejectVm("Airspace closed due to storm");
            flightService.rejectFlight("flight-123", rejectVm);

            assertThat(testFlight.getStatus()).isEqualTo(FlightStatus.CANCELLED);
            assertThat(testFlight.getAuthorizationStatus()).isEqualTo(FlightAuthorizationStatus.REJECTED);
            assertThat(testFlight.getNotes()).contains("Rejected reason: Airspace closed due to storm");
            verify(flightRepository).saveAndFlush(testFlight);
        }

        @Test
        @DisplayName("Should throw when rejecting an active flight")
        void rejectFlight_active_throws() {
            testFlight.setStatus(FlightStatus.ACTIVE);
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));

            FlightRejectVm rejectVm = new FlightRejectVm("Reason");
            assertThatThrownBy(() -> flightService.rejectFlight("flight-123", rejectVm))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Should throw when rejecting an already completed flight")
        void rejectFlight_completed_throws() {
            testFlight.setStatus(FlightStatus.COMPLETED);
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));

            FlightRejectVm rejectVm = new FlightRejectVm("Reason");
            assertThatThrownBy(() -> flightService.rejectFlight("flight-123", rejectVm))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Should throw when rejecting an already cancelled flight")
        void rejectFlight_alreadyCancelled_throws() {
            testFlight.setStatus(FlightStatus.CANCELLED);
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));

            FlightRejectVm rejectVm = new FlightRejectVm("Reason");
            assertThatThrownBy(() -> flightService.rejectFlight("flight-123", rejectVm))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Should throw when rejecting a flight that was already rejected")
        void rejectFlight_alreadyRejected_throws() {
            testFlight.setAuthorizationStatus(FlightAuthorizationStatus.REJECTED);
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));

            FlightRejectVm rejectVm = new FlightRejectVm("Reason");
            assertThatThrownBy(() -> flightService.rejectFlight("flight-123", rejectVm))
                    .isInstanceOf(BadRequestException.class);
        }
    }

    @Nested
    @DisplayName("startFlight")
    class StartFlightTests {

        @Test
        @DisplayName("Should start flight successfully when AUTHORIZED and APPROVED")
        void startFlight_success() {
            testFlight.setStatus(FlightStatus.AUTHORIZED);
            testFlight.setAuthorizationStatus(FlightAuthorizationStatus.APPROVED);
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));
            when(flightRepository.saveAndFlush(any(Flight.class))).thenAnswer(invocation -> invocation.getArgument(0));

            flightService.startFlight("flight-123");

            assertThat(testFlight.getStatus()).isEqualTo(FlightStatus.ACTIVE);
            assertThat(testFlight.getActualDeparture()).isNotNull();
            verify(flightRepository).saveAndFlush(testFlight);
        }

        @Test
        @DisplayName("Should throw when flight is not in AUTHORIZED status")
        void startFlight_notAuthorized_throws() {
            testFlight.setStatus(FlightStatus.SCHEDULED);
            testFlight.setAuthorizationStatus(FlightAuthorizationStatus.APPROVED);
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));

            assertThatThrownBy(() -> flightService.startFlight("flight-123"))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Should throw when authorization status is not APPROVED")
        void startFlight_notApproved_throws() {
            testFlight.setStatus(FlightStatus.AUTHORIZED);
            testFlight.setAuthorizationStatus(FlightAuthorizationStatus.PENDING);
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));

            assertThatThrownBy(() -> flightService.startFlight("flight-123"))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Should throw when flight is COMPLETED")
        void startFlight_alreadyCompleted_throws() {
            testFlight.setStatus(FlightStatus.COMPLETED);
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));

            assertThatThrownBy(() -> flightService.startFlight("flight-123"))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Should throw when flight is CANCELLED")
        void startFlight_alreadyCancelled_throws() {
            testFlight.setStatus(FlightStatus.CANCELLED);
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));

            assertThatThrownBy(() -> flightService.startFlight("flight-123"))
                    .isInstanceOf(BadRequestException.class);
        }
    }

    @Nested
    @DisplayName("completeFlight")
    class CompleteFlightTests {

        @Test
        @DisplayName("Should complete active flight successfully")
        void completeFlight_success() {
            testFlight.setStatus(FlightStatus.ACTIVE);
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));
            when(flightRepository.saveAndFlush(any(Flight.class))).thenAnswer(invocation -> invocation.getArgument(0));

            flightService.completeFlight("flight-123");

            assertThat(testFlight.getStatus()).isEqualTo(FlightStatus.COMPLETED);
            assertThat(testFlight.getActualArrival()).isNotNull();
            verify(flightRepository).saveAndFlush(testFlight);
        }

        @Test
        @DisplayName("Should throw when flight is not active")
        void completeFlight_notActive_throws() {
            testFlight.setStatus(FlightStatus.SCHEDULED);
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));

            assertThatThrownBy(() -> flightService.completeFlight("flight-123"))
                    .isInstanceOf(BadRequestException.class);
        }
    }

    @Nested
    @DisplayName("abortFlight")
    class AbortFlightTests {

        @Test
        @DisplayName("Should transition ACTIVE flight to EMERGENCY_LANDING on abort")
        void abortFlight_active_transitionsToEmergencyLanding() {
            testFlight.setStatus(FlightStatus.ACTIVE);
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));
            when(flightRepository.saveAndFlush(any(Flight.class))).thenAnswer(invocation -> invocation.getArgument(0));

            FlightAbortVm abortVm = new FlightAbortVm("Critical battery degradation");
            flightService.abortFlight("flight-123", abortVm);

            assertThat(testFlight.getStatus()).isEqualTo(FlightStatus.EMERGENCY_LANDING);
            assertThat(testFlight.getNotes()).contains("Aborted reason: Critical battery degradation");
            verify(flightRepository).saveAndFlush(testFlight);
        }

        @Test
        @DisplayName("Should transition DIVERTED flight to EMERGENCY_LANDING on abort")
        void abortFlight_diverted_transitionsToEmergencyLanding() {
            testFlight.setStatus(FlightStatus.DIVERTED);
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));
            when(flightRepository.saveAndFlush(any(Flight.class))).thenAnswer(invocation -> invocation.getArgument(0));

            FlightAbortVm abortVm = new FlightAbortVm("Diverted flight emergency landing");
            flightService.abortFlight("flight-123", abortVm);

            assertThat(testFlight.getStatus()).isEqualTo(FlightStatus.EMERGENCY_LANDING);
            assertThat(testFlight.getNotes()).contains("Aborted reason: Diverted flight emergency landing");
            verify(flightRepository).saveAndFlush(testFlight);
        }

        @Test
        @DisplayName("Should transition pre-flight (SCHEDULED) flight to CANCELLED on abort")
        void abortFlight_scheduled_transitionsToCancelled() {
            testFlight.setStatus(FlightStatus.SCHEDULED);
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));
            when(flightRepository.saveAndFlush(any(Flight.class))).thenAnswer(invocation -> invocation.getArgument(0));

            FlightAbortVm abortVm = new FlightAbortVm("Mission cancelled before takeoff");
            flightService.abortFlight("flight-123", abortVm);

            assertThat(testFlight.getStatus()).isEqualTo(FlightStatus.CANCELLED);
            assertThat(testFlight.getNotes()).contains("Aborted reason: Mission cancelled before takeoff");
            verify(flightRepository).saveAndFlush(testFlight);
        }

        @Test
        @DisplayName("Should throw when aborting a COMPLETED flight")
        void abortFlight_completed_throws() {
            testFlight.setStatus(FlightStatus.COMPLETED);
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));

            FlightAbortVm abortVm = new FlightAbortVm("Reason");
            assertThatThrownBy(() -> flightService.abortFlight("flight-123", abortVm))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Should throw when aborting a CANCELLED flight")
        void abortFlight_cancelled_throws() {
            testFlight.setStatus(FlightStatus.CANCELLED);
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));

            FlightAbortVm abortVm = new FlightAbortVm("Reason");
            assertThatThrownBy(() -> flightService.abortFlight("flight-123", abortVm))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Should throw when aborting an already EMERGENCY_LANDING flight")
        void abortFlight_emergencyLanding_throws() {
            testFlight.setStatus(FlightStatus.EMERGENCY_LANDING);
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));

            FlightAbortVm abortVm = new FlightAbortVm("Reason");
            assertThatThrownBy(() -> flightService.abortFlight("flight-123", abortVm))
                    .isInstanceOf(BadRequestException.class);
        }
    }

    @Nested
    @DisplayName("updateFlight")
    class UpdateFlightTests {

        @Test
        @DisplayName("Should throw when modifying an ACTIVE flight")
        void updateFlight_active_throws() {
            testFlight.setStatus(FlightStatus.ACTIVE);
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));

            FlightPutVm putVm = new FlightPutVm(null, null, null, null, null, null, null, null, null, null, null, null);
            assertThatThrownBy(() -> flightService.updateFlight("flight-123", putVm))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Should throw when modifying a COMPLETED flight")
        void updateFlight_completed_throws() {
            testFlight.setStatus(FlightStatus.COMPLETED);
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));

            FlightPutVm putVm = new FlightPutVm(null, null, null, null, null, null, null, null, null, null, null, null);
            assertThatThrownBy(() -> flightService.updateFlight("flight-123", putVm))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Should throw when modifying a CANCELLED flight")
        void updateFlight_cancelled_throws() {
            testFlight.setStatus(FlightStatus.CANCELLED);
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));

            FlightPutVm putVm = new FlightPutVm(null, null, null, null, null, null, null, null, null, null, null, null);
            assertThatThrownBy(() -> flightService.updateFlight("flight-123", putVm))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Should throw when modifying an EMERGENCY_LANDING flight")
        void updateFlight_emergencyLanding_throws() {
            testFlight.setStatus(FlightStatus.EMERGENCY_LANDING);
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));

            FlightPutVm putVm = new FlightPutVm(null, null, null, null, null, null, null, null, null, null, null, null);
            assertThatThrownBy(() -> flightService.updateFlight("flight-123", putVm))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Should throw when modifying a DIVERTED flight")
        void updateFlight_diverted_throws() {
            testFlight.setStatus(FlightStatus.DIVERTED);
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));

            FlightPutVm putVm = new FlightPutVm(null, null, null, null, null, null, null, null, null, null, null, null);
            assertThatThrownBy(() -> flightService.updateFlight("flight-123", putVm))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Should reset status to SCHEDULED and authorization to PENDING when AUTHORIZED flight is modified")
        void updateFlight_authorized_resetsToScheduledAndPending() {
            testFlight.setStatus(FlightStatus.AUTHORIZED);
            testFlight.setAuthorizationStatus(FlightAuthorizationStatus.APPROVED);

            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));
            when(flightRepository.saveAndFlush(any(Flight.class))).thenAnswer(invocation -> invocation.getArgument(0));

            FlightPutVm putVm = new FlightPutVm(null, null, null, null, null, null, 150.0, "Updated altitude", null, null, null, null);
            flightService.updateFlight("flight-123", putVm);

            assertThat(testFlight.getStatus()).isEqualTo(FlightStatus.SCHEDULED);
            assertThat(testFlight.getAuthorizationStatus()).isEqualTo(FlightAuthorizationStatus.PENDING);
            verify(flightRepository).saveAndFlush(testFlight);
        }
    }
}

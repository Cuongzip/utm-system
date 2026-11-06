package com.utm.flight.service;

import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.flight.mapper.FlightMapper;
import com.utm.flight.model.Flight;
import com.utm.flight.model.enumeration.FlightAuthorizationStatus;
import com.utm.flight.model.enumeration.FlightStatus;
import com.utm.flight.model.enumeration.Verdict;
import com.utm.flight.repository.FlightRepository;
import com.utm.flight.service.client.DroneClientService;
import com.utm.flight.service.client.HubClientService;
import com.utm.flight.viewmodel.client.HubBriefVm;
import com.utm.flight.viewmodel.flight.FlightAbortVm;
import com.utm.flight.viewmodel.flight.FlightListVm;
import com.utm.flight.viewmodel.flight.FlightPostVm;
import com.utm.flight.viewmodel.flight.FlightPutVm;
import com.utm.flight.viewmodel.flight.FlightRejectVm;
import com.utm.flight.viewmodel.flight.FlightVm;
import com.utm.flight.viewmodel.flight.GeoJsonLineStringVm;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("unchecked")
@DisplayName("Unit Tests: FlightServiceImpl (Specification-Driven)")
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

            FlightPutVm putVm = new FlightPutVm(null, null, null, null, null, null, 150.0, "Updated altitude", null,
                    null, null, null);
            flightService.updateFlight("flight-123", putVm);

            assertThat(testFlight.getStatus()).isEqualTo(FlightStatus.SCHEDULED);
            assertThat(testFlight.getAuthorizationStatus()).isEqualTo(FlightAuthorizationStatus.PENDING);
            verify(flightRepository).saveAndFlush(testFlight);
        }

        @Test
        @DisplayName("Should throw NotFoundException when updated drone does not exist")
        void updateFlight_droneNotFound_throwsNotFoundException() {
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));
            when(droneClientService.checkDroneExists("unknown-drone")).thenReturn(false);

            FlightPutVm putVm = new FlightPutVm("unknown-drone", null, null, null, null, null, null, null, null, null,
                    null, null);
            assertThatThrownBy(() -> flightService.updateFlight("flight-123", putVm))
                    .isInstanceOf(NotFoundException.class);
        }

        @Test
        @DisplayName("Should throw NotFoundException when updated departure hub does not exist")
        void updateFlight_depHubNotFound_throwsNotFoundException() {
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));
            when(hubClientService.checkHubExists("unknown-dep-hub")).thenReturn(false);

            FlightPutVm putVm = new FlightPutVm(null, "unknown-dep-hub", null, null, null, null, null, null, null, null,
                    null, null);
            assertThatThrownBy(() -> flightService.updateFlight("flight-123", putVm))
                    .isInstanceOf(NotFoundException.class);
        }

        @Test
        @DisplayName("Should throw NotFoundException when updated arrival hub does not exist")
        void updateFlight_arrHubNotFound_throwsNotFoundException() {
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));
            when(hubClientService.checkHubExists("unknown-arr-hub")).thenReturn(false);

            FlightPutVm putVm = new FlightPutVm(null, null, "unknown-arr-hub", null, null, null, null, null, null, null,
                    null, null);
            assertThatThrownBy(() -> flightService.updateFlight("flight-123", putVm))
                    .isInstanceOf(NotFoundException.class);
        }
    }

    @Nested
    @DisplayName("createFlight")
    class CreateFlightTests {

        private HubBriefVm depHub;
        private HubBriefVm arrHub;

        @BeforeEach
        void initHubs() {
            depHub = new HubBriefVm("hub-dep", "H-DEP", "Dep Hub",
                    new com.utm.flight.viewmodel.flight.LocationVm(10.7769, 106.7009), 20.0);
            arrHub = new HubBriefVm("hub-arr", "H-ARR", "Arr Hub",
                    new com.utm.flight.viewmodel.flight.LocationVm(10.7554, 106.6598), 25.0);
        }

        @Test
        @DisplayName("Should throw DuplicatedException when flight number already exists")
        void createFlight_duplicatedFlightNumber_throwsDuplicatedException() {
            FlightPostVm postVm = new FlightPostVm(
                    "FL-001", "drone-123", "hub-dep", "hub-arr", "PILOT-1",
                    ZonedDateTime.now().plusHours(1), ZonedDateTime.now().plusHours(2),
                    100.0, "Notes", null, null, null, null);
            when(flightRepository.existsByFlightNumber("FL-001")).thenReturn(true);

            assertThatThrownBy(() -> flightService.createFlight(postVm))
                    .isInstanceOf(DuplicatedException.class);

            verify(flightRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("Should throw NotFoundException when assigned drone does not exist")
        void createFlight_droneNotFound_throwsNotFoundException() {
            FlightPostVm postVm = new FlightPostVm(
                    "FL-NEW", "drone-unknown", "hub-dep", "hub-arr", "PILOT-1",
                    ZonedDateTime.now().plusHours(1), ZonedDateTime.now().plusHours(2),
                    100.0, "Notes", null, null, null, null);
            when(flightRepository.existsByFlightNumber("FL-NEW")).thenReturn(false);
            when(droneClientService.checkDroneExists("drone-unknown")).thenReturn(false);

            assertThatThrownBy(() -> flightService.createFlight(postVm))
                    .isInstanceOf(NotFoundException.class);
        }

        @Test
        @DisplayName("Should throw NotFoundException when departure hub does not exist")
        void createFlight_departureHubNotFound_throwsNotFoundException() {
            FlightPostVm postVm = new FlightPostVm(
                    "FL-NEW", "drone-123", "hub-unknown", "hub-arr", "PILOT-1",
                    ZonedDateTime.now().plusHours(1), ZonedDateTime.now().plusHours(2),
                    100.0, "Notes", null, null, null, null);
            when(flightRepository.existsByFlightNumber("FL-NEW")).thenReturn(false);
            when(droneClientService.checkDroneExists("drone-123")).thenReturn(true);
            when(hubClientService.getHubById("hub-unknown")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> flightService.createFlight(postVm))
                    .isInstanceOf(NotFoundException.class);
        }

        @Test
        @DisplayName("Should throw NotFoundException when arrival hub does not exist")
        void createFlight_arrivalHubNotFound_throwsNotFoundException() {
            FlightPostVm postVm = new FlightPostVm(
                    "FL-NEW", "drone-123", "hub-dep", "hub-unknown", "PILOT-1",
                    ZonedDateTime.now().plusHours(1), ZonedDateTime.now().plusHours(2),
                    100.0, "Notes", null, null, null, null);
            when(flightRepository.existsByFlightNumber("FL-NEW")).thenReturn(false);
            when(droneClientService.checkDroneExists("drone-123")).thenReturn(true);
            when(hubClientService.getHubById("hub-dep")).thenReturn(Optional.of(depHub));
            when(hubClientService.getHubById("hub-unknown")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> flightService.createFlight(postVm))
                    .isInstanceOf(NotFoundException.class);
        }

        @Test
        @DisplayName("Should create flight plan successfully with custom plannedRoute and executionId")
        void createFlight_withCustomPlannedRoute_success() {
            GeoJsonLineStringVm route = GeoJsonLineStringVm.of(List.of(
                    List.of(106.7009, 10.7769, 50.0),
                    List.of(106.6598, 10.7554, 30.0)));
            FlightPostVm postVm = new FlightPostVm(
                    "FL-NEW", "drone-123", "hub-dep", "hub-arr", "PILOT-1",
                    ZonedDateTime.now().plusHours(1), ZonedDateTime.now().plusHours(2),
                    100.0, "Notes", "exec-uuid-999", route, null, null);

            when(flightRepository.existsByFlightNumber("FL-NEW")).thenReturn(false);
            when(droneClientService.checkDroneExists("drone-123")).thenReturn(true);
            when(hubClientService.getHubById("hub-dep")).thenReturn(Optional.of(depHub));
            when(hubClientService.getHubById("hub-arr")).thenReturn(Optional.of(arrHub));
            when(flightMapper.toEntity(postVm)).thenReturn(testFlight);
            when(flightRepository.saveAndFlush(any(Flight.class))).thenReturn(testFlight);

            FlightVm vm = createTestFlightVm(testFlight);
            when(flightMapper.toVm(testFlight)).thenReturn(vm);

            FlightVm result = flightService.createFlight(postVm);

            assertThat(result).isNotNull();
            assertThat(result.flightNumber()).isEqualTo("FL-001");
            assertThat(testFlight.getExecutionId()).isEqualTo("exec-uuid-999");
            assertThat(testFlight.getStatus()).isEqualTo(FlightStatus.SCHEDULED);
            assertThat(testFlight.getAuthorizationStatus()).isEqualTo(FlightAuthorizationStatus.PENDING);
            verify(flightRepository).saveAndFlush(testFlight);
        }
    }

    @Nested
    @DisplayName("getFlightById")
    class GetFlightByIdTests {

        @Test
        @DisplayName("Should return FlightVm when flight exists")
        void getFlightById_found_returnsVm() {
            when(flightRepository.findById("flight-123")).thenReturn(Optional.of(testFlight));
            FlightVm expectedVm = createTestFlightVm(testFlight);
            when(flightMapper.toVm(testFlight)).thenReturn(expectedVm);

            FlightVm result = flightService.getFlightById("flight-123");

            assertThat(result).isNotNull();
            assertThat(result.id()).isEqualTo("flight-123");
            assertThat(result.flightNumber()).isEqualTo("FL-001");
        }

        @Test
        @DisplayName("Should throw NotFoundException when flight does not exist")
        void getFlightById_notFound_throwsNotFoundException() {
            when(flightRepository.findById("unknown-id")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> flightService.getFlightById("unknown-id"))
                    .isInstanceOf(NotFoundException.class);
        }
    }

    @Nested
    @DisplayName("getFlights")
    class GetFlightsTests {

        @Test
        @DisplayName("Should return paginated FlightListVm matching filters")
        void getFlights_paginated_returnsFlightListVm() {
            Page<Flight> page = new PageImpl<>(List.of(testFlight));
            when(flightRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);
            FlightVm expectedVm = createTestFlightVm(testFlight);
            when(flightMapper.toVmList(List.of(testFlight))).thenReturn(List.of(expectedVm));

            FlightListVm result = flightService.getFlights("scheduled", "pending", "pilot-1", "drone-123", 10, 0);

            assertThat(result).isNotNull();
            assertThat(result.total()).isEqualTo(1L);
            assertThat(result.items()).hasSize(1);
            assertThat(result.items().get(0).id()).isEqualTo("flight-123");
        }

        @Test
        @DisplayName("Should return unpaged list when limit is zero or negative")
        void getFlights_unpaged_returnsAll() {
            when(flightRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(testFlight));
            FlightVm expectedVm = createTestFlightVm(testFlight);
            when(flightMapper.toVmList(List.of(testFlight))).thenReturn(List.of(expectedVm));

            FlightListVm result = flightService.getFlights("scheduled", null, null, null, 0, 0);

            assertThat(result).isNotNull();
            assertThat(result.total()).isEqualTo(1L);
            assertThat(result.items()).hasSize(1);
        }

        @Test
        @DisplayName("getAllFlights - returns unpaged list of FlightVm")
        void getAllFlights_returnsList() {
            when(flightRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(testFlight));
            FlightVm expectedVm = createTestFlightVm(testFlight);
            when(flightMapper.toVmList(List.of(testFlight))).thenReturn(List.of(expectedVm));

            List<FlightVm> result = flightService.getAllFlights("scheduled", null, "drone-123");

            assertThat(result).hasSize(1);
            assertThat(result.get(0).id()).isEqualTo("flight-123");
        }
    }

    private FlightVm createTestFlightVm(Flight flight) {
        return new FlightVm(
                flight.getId(),
                flight.getFlightNumber(),
                flight.getDroneId(),
                flight.getDepartureHubId(),
                flight.getArrivalHubId(),
                flight.getPilotId(),
                flight.getScheduledDeparture(),
                flight.getScheduledArrival(),
                flight.getActualDeparture(),
                flight.getActualArrival(),
                flight.getCruisingAltitudeM(),
                flight.getExecutionId(),
                null,
                null,
                flight.getAuthorizationStatus(),
                flight.getConformanceStatus(),
                flight.getStatus(),
                flight.getFeasibilityVerdict(),
                flight.getFeasibilityOverride(),
                flight.getNotes(),
                flight.getCreatedOn(),
                flight.getCreatedBy(),
                flight.getLastModifiedOn(),
                flight.getLastModifiedBy());
    }
}

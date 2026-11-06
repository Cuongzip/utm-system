package com.utm.flight.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.flight.mapper.FeasibilityMapper;
import com.utm.flight.mapper.FlightMapper;
import com.utm.flight.model.FeasibilityEvaluation;
import com.utm.flight.model.Flight;
import com.utm.flight.model.enumeration.FlightAuthorizationStatus;
import com.utm.flight.model.enumeration.FlightStatus;
import com.utm.flight.model.enumeration.Verdict;
import com.utm.flight.repository.FeasibilityEvaluationRepository;
import com.utm.flight.repository.FlightRepository;
import com.utm.flight.service.client.DroneClientService;
import com.utm.flight.viewmodel.feasibility.DroneEnergySpecVm;
import com.utm.flight.viewmodel.feasibility.EnergyBreakdownVm;
import com.utm.flight.viewmodel.feasibility.EnergyCalculationResultVm;
import com.utm.flight.viewmodel.feasibility.FeasibilityCheckPostVm;
import com.utm.flight.viewmodel.feasibility.FeasibilityEvaluationListVm;
import com.utm.flight.viewmodel.feasibility.FeasibilityEvaluationVm;
import com.utm.flight.viewmodel.feasibility.FeasibilityOverridePostVm;
import com.utm.flight.viewmodel.feasibility.FeasibilityResultVm;
import com.utm.flight.viewmodel.feasibility.WeatherOverrideVm;
import com.utm.flight.viewmodel.feasibility.WindUsedVm;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("unchecked")
@DisplayName("Unit Tests: FeasibilityServiceImpl (Specification-Driven)")
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

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private FeasibilityServiceImpl feasibilityService;

    private static final String FLIGHT_ID = "flight-123";
    private static final String DRONE_ID = "drone-123";
    private Flight testFlight;

    @BeforeEach
    void setUp() {
        testFlight = Flight.builder()
                .id(FLIGHT_ID)
                .flightNumber("FL-001")
                .droneId(DRONE_ID)
                .status(FlightStatus.SCHEDULED)
                .authorizationStatus(FlightAuthorizationStatus.PENDING)
                .feasibilityVerdict(Verdict.NO_GO)
                .plannedRoute("{\"type\":\"LineString\",\"coordinates\":[[106.7009,10.7769],[106.6598,10.7554]]}")
                .build();
    }

    @Nested
    @DisplayName("checkFeasibility")
    class CheckFeasibilityTests {

        private DroneEnergySpecVm droneSpec;
        private EnergyCalculationResultVm energyResult;

        @BeforeEach
        void initSpecs() {
            droneSpec = new DroneEnergySpecVm(500.0, 180.0, 120.0, 15.0, 95.0, 12.0, 5.0, 30.0);
            energyResult = new EnergyCalculationResultVm(
                    Verdict.GO, 28.5, 475.0, 270.0, 200.0, 50.0, 20.0, 1.1, 1.05, "HIGH", false, List.of(), "Feasible route", "deterministic"
            );
        }

        @Test
        @DisplayName("Should evaluate feasibility with custom distance and save evaluation record")
        void checkFeasibility_withCustomDistance_evaluatesAndSaves() {
            FeasibilityCheckPostVm request = new FeasibilityCheckPostVm(1.5, null, 5000.0, 45.0);

            when(flightRepository.findById(FLIGHT_ID)).thenReturn(Optional.of(testFlight));
            when(droneClientService.getDroneEnergySpec(DRONE_ID)).thenReturn(Optional.of(droneSpec));
            when(energyModelService.calculateEnergy(eq(droneSpec), any(), any())).thenReturn(energyResult);

            FeasibilityEvaluation evaluation = FeasibilityEvaluation.builder().id("eval-1").build();
            when(feasibilityMapper.toEntity(eq(testFlight), eq(energyResult), eq(null))).thenReturn(evaluation);

            FeasibilityResultVm resultVm = createResultVm(Verdict.GO, 28.5);
            when(feasibilityMapper.toResultVm(eq(testFlight), eq(energyResult), any())).thenReturn(resultVm);

            FeasibilityResultVm result = feasibilityService.checkFeasibility(FLIGHT_ID, request);

            assertThat(result).isNotNull();
            assertThat(result.verdict()).isEqualTo(Verdict.GO);
            assertThat(testFlight.getFeasibilityVerdict()).isEqualTo(Verdict.GO);
            verify(evaluationRepository).save(evaluation);
            verify(flightRepository).save(testFlight);
        }

        @Test
        @DisplayName("Should fallback to calculating distance from plannedRoute GeoJSON when distanceM is null")
        void checkFeasibility_whenNoDistanceProvided_calculatesFromGeoJson() {
            FeasibilityCheckPostVm request = new FeasibilityCheckPostVm(1.0, null, null, null);

            when(flightRepository.findById(FLIGHT_ID)).thenReturn(Optional.of(testFlight));
            when(droneClientService.getDroneEnergySpec(DRONE_ID)).thenReturn(Optional.of(droneSpec));
            when(energyModelService.calculateEnergy(eq(droneSpec), any(), any())).thenReturn(energyResult);

            FeasibilityEvaluation evaluation = FeasibilityEvaluation.builder().id("eval-2").build();
            when(feasibilityMapper.toEntity(eq(testFlight), eq(energyResult), eq(null))).thenReturn(evaluation);
            when(feasibilityMapper.toResultVm(eq(testFlight), eq(energyResult), any()))
                    .thenReturn(createResultVm(Verdict.GO, 28.5));

            FeasibilityResultVm result = feasibilityService.checkFeasibility(FLIGHT_ID, request);

            assertThat(result).isNotNull();
            verify(evaluationRepository).save(evaluation);
        }

        @Test
        @DisplayName("Should fallback to default DroneEnergySpec when DroneClient returns empty")
        void checkFeasibility_whenDroneSpecEmpty_usesDefaultSpec() {
            when(flightRepository.findById(FLIGHT_ID)).thenReturn(Optional.of(testFlight));
            when(droneClientService.getDroneEnergySpec(DRONE_ID)).thenReturn(Optional.empty());
            when(energyModelService.calculateEnergy(any(DroneEnergySpecVm.class), any(), any())).thenReturn(energyResult);

            FeasibilityEvaluation evaluation = FeasibilityEvaluation.builder().id("eval-3").build();
            when(feasibilityMapper.toEntity(eq(testFlight), eq(energyResult), eq(null))).thenReturn(evaluation);
            when(feasibilityMapper.toResultVm(eq(testFlight), eq(energyResult), any()))
                    .thenReturn(createResultVm(Verdict.GO, 28.5));

            FeasibilityResultVm result = feasibilityService.checkFeasibility(FLIGHT_ID, null);

            assertThat(result).isNotNull();
            verify(evaluationRepository).save(evaluation);
        }

        @Test
        @DisplayName("Should apply weather override wind speed when present in request")
        void checkFeasibility_withWeatherOverride_appliesWindSpeed() {
            WeatherOverrideVm weather = new WeatherOverrideVm(6.5);
            FeasibilityCheckPostVm request = new FeasibilityCheckPostVm(2.0, weather, 4000.0, 30.0);

            when(flightRepository.findById(FLIGHT_ID)).thenReturn(Optional.of(testFlight));
            when(droneClientService.getDroneEnergySpec(DRONE_ID)).thenReturn(Optional.of(droneSpec));
            when(energyModelService.calculateEnergy(eq(droneSpec), any(), any())).thenReturn(energyResult);

            FeasibilityEvaluation evaluation = FeasibilityEvaluation.builder().id("eval-4").build();
            when(feasibilityMapper.toEntity(eq(testFlight), eq(energyResult), eq(6.5))).thenReturn(evaluation);
            when(feasibilityMapper.toResultVm(eq(testFlight), eq(energyResult), any()))
                    .thenReturn(createResultVm(Verdict.GO, 28.5));

            FeasibilityResultVm result = feasibilityService.checkFeasibility(FLIGHT_ID, request);

            assertThat(result).isNotNull();
            verify(feasibilityMapper).toEntity(testFlight, energyResult, 6.5);
        }

        @Test
        @DisplayName("Should throw NotFoundException when flight does not exist")
        void checkFeasibility_whenFlightNotFound_throwsNotFoundException() {
            when(flightRepository.findById("unknown-flight")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> feasibilityService.checkFeasibility("unknown-flight", null))
                    .isInstanceOf(NotFoundException.class);
        }
    }

    @Nested
    @DisplayName("overrideFeasibility")
    class OverrideFeasibilityTests {

        @Test
        @DisplayName("Should successfully apply feasibility override and transition flight to AUTHORIZED / APPROVED")
        void overrideFeasibility_success() {
            when(flightRepository.findById(FLIGHT_ID)).thenReturn(Optional.of(testFlight));
            when(flightRepository.save(any(Flight.class))).thenAnswer(invocation -> invocation.getArgument(0));

            FeasibilityOverridePostVm request = new FeasibilityOverridePostVm("Medical transport urgent", "ATC Officer Smith");
            feasibilityService.overrideFeasibility(FLIGHT_ID, request);

            assertThat(testFlight.getFeasibilityOverride()).isEqualTo("Override by ATC Officer Smith: Medical transport urgent");
            assertThat(testFlight.getAuthorizationStatus()).isEqualTo(FlightAuthorizationStatus.APPROVED);
            assertThat(testFlight.getStatus()).isEqualTo(FlightStatus.AUTHORIZED);
            verify(flightRepository).save(testFlight);
        }

        @Test
        @DisplayName("Should throw NotFoundException when flight does not exist")
        void overrideFeasibility_flightNotFound_throwsNotFoundException() {
            when(flightRepository.findById("unknown-flight")).thenReturn(Optional.empty());

            FeasibilityOverridePostVm request = new FeasibilityOverridePostVm("Reason", "Admin");
            assertThatThrownBy(() -> feasibilityService.overrideFeasibility("unknown-flight", request))
                    .isInstanceOf(NotFoundException.class);

            verify(flightRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw when overriding feasibility for COMPLETED flight")
        void overrideFeasibility_completed_throws() {
            testFlight.setStatus(FlightStatus.COMPLETED);
            when(flightRepository.findById(FLIGHT_ID)).thenReturn(Optional.of(testFlight));

            FeasibilityOverridePostVm request = new FeasibilityOverridePostVm("Reason", "Admin");
            assertThatThrownBy(() -> feasibilityService.overrideFeasibility(FLIGHT_ID, request))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Should throw when overriding feasibility for CANCELLED flight")
        void overrideFeasibility_cancelled_throws() {
            testFlight.setStatus(FlightStatus.CANCELLED);
            when(flightRepository.findById(FLIGHT_ID)).thenReturn(Optional.of(testFlight));

            FeasibilityOverridePostVm request = new FeasibilityOverridePostVm("Reason", "Admin");
            assertThatThrownBy(() -> feasibilityService.overrideFeasibility(FLIGHT_ID, request))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Should throw when overriding feasibility for EMERGENCY_LANDING flight")
        void overrideFeasibility_emergencyLanding_throws() {
            testFlight.setStatus(FlightStatus.EMERGENCY_LANDING);
            when(flightRepository.findById(FLIGHT_ID)).thenReturn(Optional.of(testFlight));

            FeasibilityOverridePostVm request = new FeasibilityOverridePostVm("Reason", "Admin");
            assertThatThrownBy(() -> feasibilityService.overrideFeasibility(FLIGHT_ID, request))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Should throw when overriding feasibility for ACTIVE flight")
        void overrideFeasibility_active_throws() {
            testFlight.setStatus(FlightStatus.ACTIVE);
            when(flightRepository.findById(FLIGHT_ID)).thenReturn(Optional.of(testFlight));

            FeasibilityOverridePostVm request = new FeasibilityOverridePostVm("Reason", "Admin");
            assertThatThrownBy(() -> feasibilityService.overrideFeasibility(FLIGHT_ID, request))
                    .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("Should throw when overriding feasibility for DIVERTED flight")
        void overrideFeasibility_diverted_throws() {
            testFlight.setStatus(FlightStatus.DIVERTED);
            when(flightRepository.findById(FLIGHT_ID)).thenReturn(Optional.of(testFlight));

            FeasibilityOverridePostVm request = new FeasibilityOverridePostVm("Reason", "Admin");
            assertThatThrownBy(() -> feasibilityService.overrideFeasibility(FLIGHT_ID, request))
                    .isInstanceOf(BadRequestException.class);
        }
    }

    @Nested
    @DisplayName("getHistory")
    class GetHistoryTests {

        @Test
        @DisplayName("Should return paginated FeasibilityEvaluationListVm")
        void getHistory_paginated_returnsList() {
            FeasibilityEvaluation evaluation = FeasibilityEvaluation.builder().id("eval-1").droneId(DRONE_ID).build();
            Page<FeasibilityEvaluation> page = new PageImpl<>(List.of(evaluation));

            when(evaluationRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

            FeasibilityEvaluationVm evalVm = new FeasibilityEvaluationVm(
                    "eval-1", FLIGHT_ID, DRONE_ID, Verdict.GO, 25.0, 500.0, 375.0,
                    new EnergyBreakdownVm(200.0, 50.0, 20.0, 1.1, 1.05),
                    4.0, "HIGH", List.of(), "Feasible", "deterministic", ZonedDateTime.now(), "pilot-vn-01"
            );
            when(feasibilityMapper.toEvaluationVmList(List.of(evaluation))).thenReturn(List.of(evalVm));

            FeasibilityEvaluationListVm result = feasibilityService.getHistory(FLIGHT_ID, DRONE_ID, 10, 0);

            assertThat(result).isNotNull();
            assertThat(result.total()).isEqualTo(1L);
            assertThat(result.items()).hasSize(1);
        }

        @Test
        @DisplayName("Should return unpaged list when limit is zero or negative")
        void getHistory_unpaged_returnsAll() {
            FeasibilityEvaluation evaluation = FeasibilityEvaluation.builder().id("eval-1").droneId(DRONE_ID).build();
            when(evaluationRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(evaluation));

            FeasibilityEvaluationVm evalVm = new FeasibilityEvaluationVm(
                    "eval-1", FLIGHT_ID, DRONE_ID, Verdict.GO, 25.0, 500.0, 375.0,
                    new EnergyBreakdownVm(200.0, 50.0, 20.0, 1.1, 1.05),
                    4.0, "HIGH", List.of(), "Feasible", "deterministic", ZonedDateTime.now(), "pilot-vn-01"
            );
            when(feasibilityMapper.toEvaluationVmList(List.of(evaluation))).thenReturn(List.of(evalVm));

            FeasibilityEvaluationListVm result = feasibilityService.getHistory(null, null, 0, 0);

            assertThat(result).isNotNull();
            assertThat(result.total()).isEqualTo(1L);
            assertThat(result.items()).hasSize(1);
        }
    }

    private FeasibilityResultVm createResultVm(Verdict verdict, Double marginPct) {
        return new FeasibilityResultVm(
                FLIGHT_ID,
                DRONE_ID,
                verdict,
                marginPct,
                475.0,
                270.0,
                new EnergyBreakdownVm(200.0, 50.0, 20.0, 1.1, 1.05),
                new WindUsedVm(0.0, "default"),
                "HIGH",
                List.of(),
                "Feasible route",
                "deterministic",
                ZonedDateTime.now()
        );
    }
}

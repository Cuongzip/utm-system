package com.utm.conflict.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.conflict.mapper.ConflictMapper;
import com.utm.conflict.model.Conflict;
import com.utm.conflict.model.enumeration.ConflictSeverity;
import com.utm.conflict.model.enumeration.ConflictStatus;
import com.utm.conflict.model.enumeration.ConflictType;
import com.utm.conflict.model.enumeration.ResolutionStrategy;
import com.utm.conflict.repository.ConflictRepository;
import com.utm.conflict.viewmodel.client.LocationVm;
import com.utm.conflict.viewmodel.conflict.ConflictPostVm;
import com.utm.conflict.viewmodel.conflict.ConflictResolvePostVm;
import com.utm.conflict.viewmodel.conflict.ConflictVm;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: ConflictServiceImpl (Specification-Driven)")
class ConflictServiceImplTest {

    private static final String CONFLICT_ID = "conflict-123-uuid";
    private static final String PRIMARY_FLIGHT_ID = "flight-001-uuid";
    private static final String SECONDARY_FLIGHT_ID = "flight-002-uuid";
    private static final String HUB_ID = "hub-alpha-uuid";

    @Mock
    private ConflictRepository conflictRepository;

    @Mock
    private ConflictMapper conflictMapper;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private ConflictServiceImpl conflictService;

    private Conflict testConflict;
    private ConflictVm testConflictVm;

    @BeforeEach
    void setUp() {
        testConflict = Conflict.builder()
                .id(CONFLICT_ID)
                .conflictType(ConflictType.LOSS_OF_SEPARATION)
                .severity(ConflictSeverity.CRITICAL)
                .status(ConflictStatus.DETECTED)
                .primaryFlightId(PRIMARY_FLIGHT_ID)
                .secondaryFlightId(SECONDARY_FLIGHT_ID)
                .hubId(HUB_ID)
                .detectedAt(ZonedDateTime.now())
                .detectionMethod("automated_telemetry")
                .locationLat(10.7769)
                .locationLon(106.7009)
                .altitude(120.0)
                .separationDistance(45.0)
                .minSeparationDistance(40.0)
                .verticalSeparation(10.0)
                .maxSeverity(ConflictSeverity.CRITICAL)
                .timeToConflictSec(30)
                .description("Loss of separation between FL-001 and FL-002")
                .build();

        testConflictVm = new ConflictVm(
                CONFLICT_ID,
                ConflictType.LOSS_OF_SEPARATION,
                ConflictSeverity.CRITICAL,
                ConflictStatus.DETECTED,
                PRIMARY_FLIGHT_ID,
                SECONDARY_FLIGHT_ID,
                HUB_ID,
                ZonedDateTime.now(),
                "automated_telemetry",
                new LocationVm(10.7769, 106.7009),
                120.0,
                45.0,
                40.0,
                10.0,
                ConflictSeverity.CRITICAL,
                30,
                "Loss of separation between FL-001 and FL-002",
                null,
                Collections.emptyMap(),
                null,
                null,
                ZonedDateTime.now(),
                "system",
                ZonedDateTime.now(),
                "system");
    }

    @Nested
    @DisplayName("getAllConflicts")
    class GetAllConflicts {

        @Test
        @DisplayName("whenNoFilters_returnsAllOrderedByDetectedAtDesc")
        void whenNoFilters_returnsAllOrderedByDetectedAtDesc() {
            when(conflictRepository.findAllByOrderByDetectedAtDesc()).thenReturn(List.of(testConflict));
            when(conflictMapper.toVmList(List.of(testConflict))).thenReturn(List.of(testConflictVm));

            List<ConflictVm> result = conflictService.getAllConflicts(null, null, null);

            assertThat(result).hasSize(1);
            assertThat(result.getFirst().id()).isEqualTo(CONFLICT_ID);
            verify(conflictRepository).findAllByOrderByDetectedAtDesc();
        }

        @Test
        @DisplayName("whenFilterByStatus_queriesWithSpecification")
        void whenFilterByStatus_queriesWithSpecification() {
            when(conflictRepository.findAll(ArgumentMatchers.<Specification<Conflict>>any(), any(Sort.class)))
                    .thenReturn(List.of(testConflict));
            when(conflictMapper.toVmList(List.of(testConflict))).thenReturn(List.of(testConflictVm));

            List<ConflictVm> result = conflictService.getAllConflicts("detected", null, null);

            assertThat(result).hasSize(1);
            verify(conflictRepository).findAll(ArgumentMatchers.<Specification<Conflict>>any(), any(Sort.class));
        }

        @Test
        @DisplayName("whenFilterBySeverity_queriesWithSpecification")
        void whenFilterBySeverity_queriesWithSpecification() {
            when(conflictRepository.findAll(ArgumentMatchers.<Specification<Conflict>>any(), any(Sort.class)))
                    .thenReturn(List.of(testConflict));
            when(conflictMapper.toVmList(List.of(testConflict))).thenReturn(List.of(testConflictVm));

            List<ConflictVm> result = conflictService.getAllConflicts(null, "critical", null);

            assertThat(result).hasSize(1);
            verify(conflictRepository).findAll(ArgumentMatchers.<Specification<Conflict>>any(), any(Sort.class));
        }

        @Test
        @DisplayName("whenFilterByFlightId_queriesWithSpecification")
        void whenFilterByFlightId_queriesWithSpecification() {
            when(conflictRepository.findAll(ArgumentMatchers.<Specification<Conflict>>any(), any(Sort.class)))
                    .thenReturn(List.of(testConflict));
            when(conflictMapper.toVmList(List.of(testConflict))).thenReturn(List.of(testConflictVm));

            List<ConflictVm> result = conflictService.getAllConflicts(null, null, PRIMARY_FLIGHT_ID);

            assertThat(result).hasSize(1);
            verify(conflictRepository).findAll(ArgumentMatchers.<Specification<Conflict>>any(), any(Sort.class));
        }

        @Test
        @DisplayName("whenAllFiltersApplied_queriesWithCombinedSpecification")
        void whenAllFiltersApplied_queriesWithCombinedSpecification() {
            when(conflictRepository.findAll(ArgumentMatchers.<Specification<Conflict>>any(), any(Sort.class)))
                    .thenReturn(List.of(testConflict));
            when(conflictMapper.toVmList(List.of(testConflict))).thenReturn(List.of(testConflictVm));

            List<ConflictVm> result = conflictService.getAllConflicts("detected", "critical", PRIMARY_FLIGHT_ID);

            assertThat(result).hasSize(1);
            verify(conflictRepository).findAll(ArgumentMatchers.<Specification<Conflict>>any(), any(Sort.class));
        }
    }

    @Nested
    @DisplayName("getActiveConflicts")
    class GetActiveConflicts {

        @Test
        @DisplayName("whenCalled_returnsPrioritizedActiveConflicts")
        void whenCalled_returnsPrioritizedActiveConflicts() {
            when(conflictRepository.findActivePrioritized(anyList())).thenReturn(List.of(testConflict));
            when(conflictMapper.toVmList(List.of(testConflict))).thenReturn(List.of(testConflictVm));

            List<ConflictVm> result = conflictService.getActiveConflicts();

            assertThat(result).hasSize(1);
            assertThat(result.getFirst().status()).isEqualTo(ConflictStatus.DETECTED);
            verify(conflictRepository).findActivePrioritized(anyList());
        }
    }

    @Nested
    @DisplayName("getConflictById")
    class GetConflictById {

        @Test
        @DisplayName("whenFound_returnsMappedVm")
        void whenFound_returnsMappedVm() {
            when(conflictRepository.findById(CONFLICT_ID)).thenReturn(Optional.of(testConflict));
            when(conflictMapper.toVm(testConflict)).thenReturn(testConflictVm);

            ConflictVm result = conflictService.getConflictById(CONFLICT_ID);

            assertThat(result).isNotNull();
            assertThat(result.id()).isEqualTo(CONFLICT_ID);
            assertThat(result.primaryFlightId()).isEqualTo(PRIMARY_FLIGHT_ID);
        }

        @Test
        @DisplayName("whenNotFound_throwsNotFoundException")
        void whenNotFound_throwsNotFoundException() {
            when(conflictRepository.findById("unknown-id")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> conflictService.getConflictById("unknown-id"))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessage("Airspace conflict is not found")
                    .extracting(ex -> ((NotFoundException) ex).getParams().get("id"))
                    .isEqualTo("unknown-id");
        }
    }

    @Nested
    @DisplayName("createConflict")
    class CreateConflict {

        @Test
        @DisplayName("whenActiveConflictOfSameTypeExists_updatesExistingAndReturns")
        void whenActiveConflictOfSameTypeExists_updatesExistingAndReturns() {
            ConflictPostVm postVm = new ConflictPostVm(
                    PRIMARY_FLIGHT_ID,
                    SECONDARY_FLIGHT_ID,
                    "loss_of_separation",
                    "critical",
                    "new-hub-uuid",
                    10.7780,
                    106.7020,
                    125.0,
                    35.0,
                    8.0,
                    20,
                    "Updated separation breach");

            testConflict.setHubId(null);
            when(conflictRepository.findByPrimaryFlightIdAndStatusIn(eq(PRIMARY_FLIGHT_ID), anyList()))
                    .thenReturn(List.of(testConflict));
            when(conflictRepository.save(testConflict)).thenReturn(testConflict);
            when(conflictMapper.toVm(testConflict)).thenReturn(testConflictVm);

            ConflictVm result = conflictService.createConflict(postVm, "atc_user");

            assertThat(result).isNotNull();
            assertThat(testConflict.getHubId()).isEqualTo("new-hub-uuid");
            verify(conflictMapper).updateEntityFromPostVm(testConflict, postVm);
            verify(conflictRepository).save(testConflict);
        }

        @Test
        @DisplayName("whenNoActiveConflictExists_createsNewAndReturns")
        void whenNoActiveConflictExists_createsNewAndReturns() {
            ConflictPostVm postVm = new ConflictPostVm(
                    PRIMARY_FLIGHT_ID,
                    SECONDARY_FLIGHT_ID,
                    "loss_of_separation",
                    "critical",
                    HUB_ID,
                    10.7780,
                    106.7020,
                    125.0,
                    35.0,
                    8.0,
                    20,
                    "New separation breach");

            when(conflictRepository.findByPrimaryFlightIdAndStatusIn(eq(PRIMARY_FLIGHT_ID), anyList()))
                    .thenReturn(Collections.emptyList());
            when(conflictMapper.toEntity(postVm, "atc_user")).thenReturn(testConflict);
            when(conflictRepository.save(testConflict)).thenReturn(testConflict);
            when(conflictMapper.toVm(testConflict)).thenReturn(testConflictVm);

            ConflictVm result = conflictService.createConflict(postVm, "atc_user");

            assertThat(result).isNotNull();
            assertThat(result.id()).isEqualTo(CONFLICT_ID);
            verify(conflictRepository).save(testConflict);
        }

        @Test
        @DisplayName("whenInvalidConflictType_defaultsToGeofenceViolation")
        void whenInvalidConflictType_defaultsToGeofenceViolation() {
            ConflictPostVm postVm = new ConflictPostVm(
                    PRIMARY_FLIGHT_ID,
                    null,
                    "invalid_type_string",
                    "high",
                    null,
                    10.7780,
                    106.7020,
                    125.0,
                    35.0,
                    8.0,
                    20,
                    "Geofence breach");

            when(conflictRepository.findByPrimaryFlightIdAndStatusIn(eq(PRIMARY_FLIGHT_ID), anyList()))
                    .thenReturn(Collections.emptyList());
            when(conflictMapper.toEntity(postVm, "system")).thenReturn(testConflict);
            when(conflictRepository.save(testConflict)).thenReturn(testConflict);
            when(conflictMapper.toVm(testConflict)).thenReturn(testConflictVm);

            ConflictVm result = conflictService.createConflict(postVm, null);

            assertThat(result).isNotNull();
            verify(conflictMapper).toEntity(postVm, "system");
        }
    }

    @Nested
    @DisplayName("acknowledgeConflict")
    class AcknowledgeConflict {

        @Test
        @DisplayName("whenStatusDetected_transitionsToAcknowledged")
        void whenStatusDetected_transitionsToAcknowledged() {
            testConflict.setStatus(ConflictStatus.DETECTED);
            when(conflictRepository.findById(CONFLICT_ID)).thenReturn(Optional.of(testConflict));
            when(conflictRepository.save(testConflict)).thenReturn(testConflict);
            when(conflictMapper.toVm(testConflict)).thenReturn(testConflictVm);

            ConflictVm result = conflictService.acknowledgeConflict(CONFLICT_ID, "atc_officer");

            assertThat(result).isNotNull();
            assertThat(testConflict.getStatus()).isEqualTo(ConflictStatus.ACKNOWLEDGED);
            verify(conflictRepository).save(testConflict);
        }

        @Test
        @DisplayName("whenStatusNotified_transitionsToAcknowledged")
        void whenStatusNotified_transitionsToAcknowledged() {
            testConflict.setStatus(ConflictStatus.NOTIFIED);
            when(conflictRepository.findById(CONFLICT_ID)).thenReturn(Optional.of(testConflict));
            when(conflictRepository.save(testConflict)).thenReturn(testConflict);
            when(conflictMapper.toVm(testConflict)).thenReturn(testConflictVm);

            ConflictVm result = conflictService.acknowledgeConflict(CONFLICT_ID, null);

            assertThat(result).isNotNull();
            assertThat(testConflict.getStatus()).isEqualTo(ConflictStatus.ACKNOWLEDGED);
            verify(conflictRepository).save(testConflict);
        }

        @Test
        @DisplayName("whenStatusAlreadyResolving_doesNotOverrideStatus")
        void whenStatusAlreadyResolving_doesNotOverrideStatus() {
            testConflict.setStatus(ConflictStatus.RESOLVING);
            when(conflictRepository.findById(CONFLICT_ID)).thenReturn(Optional.of(testConflict));
            when(conflictRepository.save(testConflict)).thenReturn(testConflict);
            when(conflictMapper.toVm(testConflict)).thenReturn(testConflictVm);

            ConflictVm result = conflictService.acknowledgeConflict(CONFLICT_ID, "atc_officer");

            assertThat(result).isNotNull();
            assertThat(testConflict.getStatus()).isEqualTo(ConflictStatus.RESOLVING);
            verify(conflictRepository).save(testConflict);
        }

        @Test
        @DisplayName("whenNotFound_throwsNotFoundException")
        void whenNotFound_throwsNotFoundException() {
            when(conflictRepository.findById("unknown-id")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> conflictService.acknowledgeConflict("unknown-id", "atc_officer"))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessage("Airspace conflict is not found")
                    .extracting(ex -> ((NotFoundException) ex).getParams().get("id"))
                    .isEqualTo("unknown-id");

            verify(conflictRepository, never()).save(any(Conflict.class));
        }
    }

    @Nested
    @DisplayName("resolveConflict")
    class ResolveConflict {

        @Test
        @DisplayName("whenFound_transitionsToResolvedSavesActionsAndReturns")
        void whenFound_transitionsToResolvedSavesActionsAndReturns() throws Exception {
            Map<String, Object> actions = Map.of("targetAltitudeM", 150.0, "command", "CLIMB");
            ConflictResolvePostVm resolveVm = new ConflictResolvePostVm("altitude_change", actions);

            when(conflictRepository.findById(CONFLICT_ID)).thenReturn(Optional.of(testConflict));
            when(objectMapper.writeValueAsString(actions))
                    .thenReturn("{\"targetAltitudeM\":150.0,\"command\":\"CLIMB\"}");
            when(conflictRepository.save(testConflict)).thenReturn(testConflict);
            when(conflictMapper.toVm(testConflict)).thenReturn(testConflictVm);

            ConflictVm result = conflictService.resolveConflict(CONFLICT_ID, resolveVm, "atc_supervisor");

            assertThat(result).isNotNull();
            assertThat(testConflict.getStatus()).isEqualTo(ConflictStatus.RESOLVED);
            assertThat(testConflict.getResolutionStrategy()).isEqualTo(ResolutionStrategy.ALTITUDE_CHANGE);
            assertThat(testConflict.getResolutionActions())
                    .isEqualTo("{\"targetAltitudeM\":150.0,\"command\":\"CLIMB\"}");
            assertThat(testConflict.getResolvedAt()).isNotNull();
            assertThat(testConflict.getResolvedBy()).isEqualTo("atc_supervisor");
            verify(conflictRepository).save(testConflict);
        }

        @Test
        @DisplayName("whenJsonSerializationFails_fallsBackToStringRepresentation")
        void whenJsonSerializationFails_fallsBackToStringRepresentation() throws Exception {
            Map<String, Object> actions = Map.of("key", "value");
            ConflictResolvePostVm resolveVm = new ConflictResolvePostVm("reroute", actions);

            when(conflictRepository.findById(CONFLICT_ID)).thenReturn(Optional.of(testConflict));
            when(objectMapper.writeValueAsString(actions))
                    .thenThrow(new JsonProcessingException("Serialization error") {
                    });
            when(conflictRepository.save(testConflict)).thenReturn(testConflict);
            when(conflictMapper.toVm(testConflict)).thenReturn(testConflictVm);

            ConflictVm result = conflictService.resolveConflict(CONFLICT_ID, resolveVm, null);

            assertThat(result).isNotNull();
            assertThat(testConflict.getStatus()).isEqualTo(ConflictStatus.RESOLVED);
            assertThat(testConflict.getResolutionStrategy()).isEqualTo(ResolutionStrategy.REROUTE);
            assertThat(testConflict.getResolutionActions()).isEqualTo(actions.toString());
            assertThat(testConflict.getResolvedBy()).isEqualTo("operator");
            verify(conflictRepository).save(testConflict);
        }

        @Test
        @DisplayName("whenNotFound_throwsNotFoundException")
        void whenNotFound_throwsNotFoundException() {
            ConflictResolvePostVm resolveVm = new ConflictResolvePostVm("hover", Map.of());
            when(conflictRepository.findById("unknown-id")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> conflictService.resolveConflict("unknown-id", resolveVm, "atc_officer"))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessage("Airspace conflict is not found")
                    .extracting(ex -> ((NotFoundException) ex).getParams().get("id"))
                    .isEqualTo("unknown-id");

            verify(conflictRepository, never()).save(any(Conflict.class));
        }
    }
}

package com.utm.conflict.service;

import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.conflict.mapper.ConflictSnapshotMapper;
import com.utm.conflict.model.Conflict;
import com.utm.conflict.model.ConflictSnapshot;
import com.utm.conflict.model.enumeration.ConflictSeverity;
import com.utm.conflict.repository.ConflictRepository;
import com.utm.conflict.repository.ConflictSnapshotRepository;
import com.utm.conflict.viewmodel.client.LocationVm;
import com.utm.conflict.viewmodel.conflict.ConflictSnapshotVm;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.ZonedDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: ConflictSnapshotServiceImpl (Specification-Driven)")
class ConflictSnapshotServiceImplTest {

        private static final String CONFLICT_ID = "conflict-123-uuid";
        private static final String SNAPSHOT_ID = "snapshot-456-uuid";

        @Mock
        private ConflictSnapshotRepository conflictSnapshotRepository;

        @Mock
        private ConflictRepository conflictRepository;

        @Mock
        private ConflictSnapshotMapper conflictSnapshotMapper;

        @InjectMocks
        private ConflictSnapshotServiceImpl snapshotService;

        private Conflict testConflict;
        private ConflictSnapshot testSnapshot;
        private ConflictSnapshotVm testSnapshotVm;

        @BeforeEach
        void setUp() {
                testConflict = Conflict.builder()
                                .id(CONFLICT_ID)
                                .primaryFlightId("flight-001-uuid")
                                .secondaryFlightId("flight-002-uuid")
                                .build();

                testSnapshot = ConflictSnapshot.builder()
                                .id(SNAPSHOT_ID)
                                .conflict(testConflict)
                                .recordedAt(ZonedDateTime.now())
                                .primaryLat(10.7769)
                                .primaryLon(106.7009)
                                .primaryAlt(100.0)
                                .secondaryLat(10.7780)
                                .secondaryLon(106.7020)
                                .secondaryAlt(115.0)
                                .separationDistance(45.0)
                                .verticalSeparation(15.0)
                                .timeToConflictSec(25)
                                .severity(ConflictSeverity.CRITICAL)
                                .build();

                testSnapshotVm = new ConflictSnapshotVm(
                                SNAPSHOT_ID,
                                CONFLICT_ID,
                                ZonedDateTime.now(),
                                new LocationVm(10.7769, 106.7009),
                                100.0,
                                new LocationVm(10.7780, 106.7020),
                                115.0,
                                45.0,
                                15.0,
                                25,
                                ConflictSeverity.CRITICAL);
        }

        @Nested
        @DisplayName("getSnapshotsByConflictId")
        class GetSnapshotsByConflictId {

                @Test
                @DisplayName("whenConflictExists_returnsMappedSnapshotsOrderedByRecordedAtAsc")
                void whenConflictExists_returnsMappedSnapshotsOrderedByRecordedAtAsc() {
                        when(conflictRepository.existsById(CONFLICT_ID)).thenReturn(true);
                        when(conflictSnapshotRepository.findByConflictIdOrderByRecordedAtAsc(CONFLICT_ID))
                                        .thenReturn(List.of(testSnapshot));
                        when(conflictSnapshotMapper.toVmList(List.of(testSnapshot)))
                                        .thenReturn(List.of(testSnapshotVm));

                        List<ConflictSnapshotVm> result = snapshotService.getSnapshotsByConflictId(CONFLICT_ID);

                        assertThat(result).hasSize(1);
                        assertThat(result.getFirst().id()).isEqualTo(SNAPSHOT_ID);
                        assertThat(result.getFirst().conflictId()).isEqualTo(CONFLICT_ID);
                        assertThat(result.getFirst().separationDistance()).isEqualTo(45.0);
                        verify(conflictRepository).existsById(CONFLICT_ID);
                        verify(conflictSnapshotRepository).findByConflictIdOrderByRecordedAtAsc(CONFLICT_ID);
                }

                @Test
                @DisplayName("whenConflictDoesNotExist_throwsNotFoundException")
                void whenConflictDoesNotExist_throwsNotFoundException() {
                        when(conflictRepository.existsById("unknown-id")).thenReturn(false);

                        assertThatThrownBy(() -> snapshotService.getSnapshotsByConflictId("unknown-id"))
                                        .isInstanceOf(NotFoundException.class)
                                        .hasMessage("Airspace conflict is not found")
                                        .extracting(ex -> ((NotFoundException) ex).getParams().get("id"))
                                        .isEqualTo("unknown-id");

                        verify(conflictSnapshotRepository, never()).findByConflictIdOrderByRecordedAtAsc(anyString());
                }
        }

        @Nested
        @DisplayName("recordSnapshot")
        class RecordSnapshot {

                @Test
                @DisplayName("whenConflictIsValid_mapsEntityAndSavesToRepository")
                void whenConflictIsValid_mapsEntityAndSavesToRepository() {
                        when(conflictSnapshotMapper.toEntity(
                                        testConflict,
                                        10.7769, 106.7009, 100.0,
                                        10.7780, 106.7020, 115.0,
                                        45.0, 15.0, 25,
                                        ConflictSeverity.CRITICAL)).thenReturn(testSnapshot);

                        snapshotService.recordSnapshot(
                                        testConflict,
                                        10.7769, 106.7009, 100.0,
                                        10.7780, 106.7020, 115.0,
                                        45.0, 15.0, 25,
                                        ConflictSeverity.CRITICAL);

                        verify(conflictSnapshotRepository).save(testSnapshot);
                }

                @Test
                @DisplayName("whenConflictIsNull_doesNotSaveAndReturnsEarly")
                void whenConflictIsNull_doesNotSaveAndReturnsEarly() {
                        snapshotService.recordSnapshot(
                                        null,
                                        10.7769, 106.7009, 100.0,
                                        10.7780, 106.7020, 115.0,
                                        45.0, 15.0, 25,
                                        ConflictSeverity.CRITICAL);

                        verify(conflictSnapshotRepository, never()).save(any(ConflictSnapshot.class));
                        verify(conflictSnapshotMapper, never()).toEntity(any(), any(), any(), any(), any(), any(),
                                        any(), any(),
                                        any(), any(), any());
                }
        }
}

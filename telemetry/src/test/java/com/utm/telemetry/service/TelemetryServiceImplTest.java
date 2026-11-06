package com.utm.telemetry.service;

import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.telemetry.mapper.TelemetryMapper;
import com.utm.telemetry.model.TelemetryRecord;
import com.utm.telemetry.repository.TelemetryRecordRepository;
import com.utm.telemetry.viewmodel.telemetry.TelemetryIngestVm;
import com.utm.telemetry.viewmodel.telemetry.TelemetryRecordVm;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: TelemetryServiceImpl (Specification-Driven)")
class TelemetryServiceImplTest {

    private static final String RECORD_ID = "record-123-uuid";
    private static final String DRONE_ID = "drone-456-uuid";
    private static final String FLIGHT_ID = "flight-789-uuid";

    @Mock
    private TelemetryRecordRepository telemetryRecordRepository;

    @Mock
    private TelemetryMapper telemetryMapper;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private TelemetryServiceImpl telemetryService;

    private TelemetryRecord testRecord;
    private TelemetryRecordVm testRecordVm;

    @BeforeEach
    void setUp() {
        testRecord = TelemetryRecord.builder()
                .id(RECORD_ID)
                .droneId(DRONE_ID)
                .flightId(FLIGHT_ID)
                .latitude(10.7769)
                .longitude(106.7009)
                .altitude(85.5)
                .speed(12.0)
                .heading(145.0)
                .pitch(1.5)
                .roll(-0.8)
                .yaw(145.0)
                .batteryPercentage(82.5)
                .build();

        testRecordVm = new TelemetryRecordVm(
                RECORD_ID,
                DRONE_ID,
                FLIGHT_ID,
                10.7769,
                106.7009,
                85.5,
                12.0,
                145.0,
                1.5,
                -0.8,
                145.0,
                82.5,
                ZonedDateTime.now()
        );
    }

    @Nested
    @DisplayName("ingestTelemetry")
    class IngestTelemetry {

        @Test
        @DisplayName("whenValidPayloadWithFlightId_persistsAndBroadcastsToAllTopicsAndCaches")
        void whenValidPayloadWithFlightId_persistsAndBroadcastsToAllTopicsAndCaches() {
            TelemetryIngestVm ingestVm = new TelemetryIngestVm(
                    DRONE_ID,
                    FLIGHT_ID,
                    10.7769,
                    106.7009,
                    85.5,
                    12.0,
                    145.0,
                    1.5,
                    -0.8,
                    145.0,
                    82.5
            );

            when(telemetryMapper.toEntity(ingestVm)).thenReturn(testRecord);
            when(telemetryRecordRepository.saveAndFlush(testRecord)).thenReturn(testRecord);
            when(telemetryMapper.toVm(testRecord)).thenReturn(testRecordVm);

            TelemetryRecordVm result = telemetryService.ingestTelemetry(ingestVm);

            assertThat(result).isNotNull();
            assertThat(result.id()).isEqualTo(RECORD_ID);
            assertThat(result.droneId()).isEqualTo(DRONE_ID);
            assertThat(result.flightId()).isEqualTo(FLIGHT_ID);
            assertThat(result.latitude()).isEqualTo(10.7769);
            assertThat(result.batteryPercentage()).isEqualTo(82.5);

            verify(telemetryRecordRepository).saveAndFlush(testRecord);
            verify(messagingTemplate).convertAndSend("/topic/telemetry/live", testRecordVm);
            verify(messagingTemplate).convertAndSend("/topic/telemetry/drone/" + DRONE_ID, testRecordVm);
            verify(messagingTemplate).convertAndSend("/topic/telemetry/flight/" + FLIGHT_ID, testRecordVm);

            TelemetryRecordVm cachedDrone = telemetryService.getLatestByDroneId(DRONE_ID);
            assertThat(cachedDrone).isEqualTo(testRecordVm);
            verify(telemetryRecordRepository, never()).findTopByDroneIdOrderByCreatedOnDesc(anyString());

            TelemetryRecordVm cachedFlight = telemetryService.getLatestByFlightId(FLIGHT_ID);
            assertThat(cachedFlight).isEqualTo(testRecordVm);
            verify(telemetryRecordRepository, never()).findTopByFlightIdOrderByCreatedOnDesc(anyString());
        }

        @Test
        @DisplayName("whenPayloadWithoutFlightId_persistsAndBroadcastsOnlyToLiveAndDroneTopics")
        void whenPayloadWithoutFlightId_persistsAndBroadcastsOnlyToLiveAndDroneTopics() {
            TelemetryIngestVm ingestVm = new TelemetryIngestVm(
                    DRONE_ID,
                    null,
                    10.7769,
                    106.7009,
                    85.5,
                    12.0,
                    145.0,
                    1.5,
                    -0.8,
                    145.0,
                    82.5
            );

            TelemetryRecord recordWithoutFlight = TelemetryRecord.builder()
                    .id(RECORD_ID)
                    .droneId(DRONE_ID)
                    .flightId(null)
                    .latitude(10.7769)
                    .longitude(106.7009)
                    .altitude(85.5)
                    .build();

            TelemetryRecordVm vmWithoutFlight = new TelemetryRecordVm(
                    RECORD_ID,
                    DRONE_ID,
                    null,
                    10.7769,
                    106.7009,
                    85.5,
                    12.0,
                    145.0,
                    1.5,
                    -0.8,
                    145.0,
                    82.5,
                    ZonedDateTime.now()
            );

            when(telemetryMapper.toEntity(ingestVm)).thenReturn(recordWithoutFlight);
            when(telemetryRecordRepository.saveAndFlush(recordWithoutFlight)).thenReturn(recordWithoutFlight);
            when(telemetryMapper.toVm(recordWithoutFlight)).thenReturn(vmWithoutFlight);

            TelemetryRecordVm result = telemetryService.ingestTelemetry(ingestVm);

            assertThat(result).isNotNull();
            assertThat(result.flightId()).isNull();

            verify(messagingTemplate).convertAndSend("/topic/telemetry/live", vmWithoutFlight);
            verify(messagingTemplate).convertAndSend("/topic/telemetry/drone/" + DRONE_ID, vmWithoutFlight);
            verify(messagingTemplate, never()).convertAndSend(eq("/topic/telemetry/flight/null"), any(Object.class));
        }

        @Test
        @DisplayName("whenWebSocketBroadcastFails_catchesExceptionAndReturnsResultSuccessfully")
        void whenWebSocketBroadcastFails_catchesExceptionAndReturnsResultSuccessfully() {
            TelemetryIngestVm ingestVm = new TelemetryIngestVm(
                    DRONE_ID,
                    FLIGHT_ID,
                    10.7769,
                    106.7009,
                    85.5,
                    12.0,
                    145.0,
                    1.5,
                    -0.8,
                    145.0,
                    82.5
            );

            when(telemetryMapper.toEntity(ingestVm)).thenReturn(testRecord);
            when(telemetryRecordRepository.saveAndFlush(testRecord)).thenReturn(testRecord);
            when(telemetryMapper.toVm(testRecord)).thenReturn(testRecordVm);
            doThrow(new RuntimeException("WebSocket broker down"))
                    .when(messagingTemplate).convertAndSend(anyString(), any(Object.class));

            TelemetryRecordVm result = telemetryService.ingestTelemetry(ingestVm);

            assertThat(result).isNotNull();
            assertThat(result.id()).isEqualTo(RECORD_ID);
            verify(telemetryRecordRepository).saveAndFlush(testRecord);
        }
    }

    @Nested
    @DisplayName("getLatestByDroneId")
    class GetLatestByDroneId {

        @Test
        @DisplayName("whenCacheMissAndFoundInDatabase_returnsMappedVmAndCaches")
        void whenCacheMissAndFoundInDatabase_returnsMappedVmAndCaches() {
            when(telemetryRecordRepository.findTopByDroneIdOrderByCreatedOnDesc(DRONE_ID))
                    .thenReturn(Optional.of(testRecord));
            when(telemetryMapper.toVm(testRecord)).thenReturn(testRecordVm);

            TelemetryRecordVm result = telemetryService.getLatestByDroneId(DRONE_ID);

            assertThat(result).isNotNull();
            assertThat(result.droneId()).isEqualTo(DRONE_ID);
            verify(telemetryRecordRepository).findTopByDroneIdOrderByCreatedOnDesc(DRONE_ID);

            TelemetryRecordVm cachedResult = telemetryService.getLatestByDroneId(DRONE_ID);
            assertThat(cachedResult).isEqualTo(result);
            verify(telemetryRecordRepository).findTopByDroneIdOrderByCreatedOnDesc(DRONE_ID);
        }

        @Test
        @DisplayName("whenNotFoundInCacheOrDatabase_throwsNotFoundException")
        void whenNotFoundInCacheOrDatabase_throwsNotFoundException() {
            when(telemetryRecordRepository.findTopByDroneIdOrderByCreatedOnDesc("unknown-drone"))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> telemetryService.getLatestByDroneId("unknown-drone"))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessageContaining("unknown-drone");
        }
    }

    @Nested
    @DisplayName("getLatestByFlightId")
    class GetLatestByFlightId {

        @Test
        @DisplayName("whenCacheMissAndFoundInDatabase_returnsMappedVmAndCaches")
        void whenCacheMissAndFoundInDatabase_returnsMappedVmAndCaches() {
            when(telemetryRecordRepository.findTopByFlightIdOrderByCreatedOnDesc(FLIGHT_ID))
                    .thenReturn(Optional.of(testRecord));
            when(telemetryMapper.toVm(testRecord)).thenReturn(testRecordVm);

            TelemetryRecordVm result = telemetryService.getLatestByFlightId(FLIGHT_ID);

            assertThat(result).isNotNull();
            assertThat(result.flightId()).isEqualTo(FLIGHT_ID);
            verify(telemetryRecordRepository).findTopByFlightIdOrderByCreatedOnDesc(FLIGHT_ID);

            TelemetryRecordVm cachedResult = telemetryService.getLatestByFlightId(FLIGHT_ID);
            assertThat(cachedResult).isEqualTo(result);
            verify(telemetryRecordRepository).findTopByFlightIdOrderByCreatedOnDesc(FLIGHT_ID);
        }

        @Test
        @DisplayName("whenNotFoundInCacheOrDatabase_throwsNotFoundException")
        void whenNotFoundInCacheOrDatabase_throwsNotFoundException() {
            when(telemetryRecordRepository.findTopByFlightIdOrderByCreatedOnDesc("unknown-flight"))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> telemetryService.getLatestByFlightId("unknown-flight"))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessageContaining("unknown-flight");
        }
    }

    @Nested
    @DisplayName("getFlightTrackHistory")
    class GetFlightTrackHistory {

        @Test
        @DisplayName("whenTimeRangeNotSpecified_returnsAllFlightRecordsOrderedAsc")
        void whenTimeRangeNotSpecified_returnsAllFlightRecordsOrderedAsc() {
            when(telemetryRecordRepository.findByFlightIdOrderByCreatedOnAsc(FLIGHT_ID))
                    .thenReturn(List.of(testRecord));
            when(telemetryMapper.toVm(testRecord)).thenReturn(testRecordVm);

            List<TelemetryRecordVm> result = telemetryService.getFlightTrackHistory(FLIGHT_ID, null, null);

            assertThat(result).hasSize(1);
            assertThat(result.getFirst().flightId()).isEqualTo(FLIGHT_ID);
            verify(telemetryRecordRepository).findByFlightIdOrderByCreatedOnAsc(FLIGHT_ID);
        }

        @Test
        @DisplayName("whenBothFromAndToProvided_queriesCreatedOnBetweenOrderedAsc")
        void whenBothFromAndToProvided_queriesCreatedOnBetweenOrderedAsc() {
            ZonedDateTime from = ZonedDateTime.now().minusHours(2);
            ZonedDateTime to = ZonedDateTime.now();

            when(telemetryRecordRepository.findByFlightIdAndCreatedOnBetweenOrderByCreatedOnAsc(FLIGHT_ID, from, to))
                    .thenReturn(List.of(testRecord));
            when(telemetryMapper.toVm(testRecord)).thenReturn(testRecordVm);

            List<TelemetryRecordVm> result = telemetryService.getFlightTrackHistory(FLIGHT_ID, from, to);

            assertThat(result).hasSize(1);
            verify(telemetryRecordRepository).findByFlightIdAndCreatedOnBetweenOrderByCreatedOnAsc(FLIGHT_ID, from, to);
        }

        @Test
        @DisplayName("whenOnlyFromProvided_defaultsToCurrentTimeAndQueriesBetween")
        void whenOnlyFromProvided_defaultsToCurrentTimeAndQueriesBetween() {
            ZonedDateTime from = ZonedDateTime.now().minusHours(1);

            when(telemetryRecordRepository.findByFlightIdAndCreatedOnBetweenOrderByCreatedOnAsc(eq(FLIGHT_ID), eq(from), any(ZonedDateTime.class)))
                    .thenReturn(List.of(testRecord));
            when(telemetryMapper.toVm(testRecord)).thenReturn(testRecordVm);

            List<TelemetryRecordVm> result = telemetryService.getFlightTrackHistory(FLIGHT_ID, from, null);

            assertThat(result).hasSize(1);
            verify(telemetryRecordRepository).findByFlightIdAndCreatedOnBetweenOrderByCreatedOnAsc(eq(FLIGHT_ID), eq(from), any(ZonedDateTime.class));
        }

        @Test
        @DisplayName("whenOnlyToProvided_defaultsFromToUnixEpochAndQueriesBetween")
        void whenOnlyToProvided_defaultsFromToUnixEpochAndQueriesBetween() {
            ZonedDateTime to = ZonedDateTime.now();
            ZonedDateTime epoch = ZonedDateTime.of(1970, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC);

            when(telemetryRecordRepository.findByFlightIdAndCreatedOnBetweenOrderByCreatedOnAsc(eq(FLIGHT_ID), eq(epoch), eq(to)))
                    .thenReturn(List.of(testRecord));
            when(telemetryMapper.toVm(testRecord)).thenReturn(testRecordVm);

            List<TelemetryRecordVm> result = telemetryService.getFlightTrackHistory(FLIGHT_ID, null, to);

            assertThat(result).hasSize(1);
            verify(telemetryRecordRepository).findByFlightIdAndCreatedOnBetweenOrderByCreatedOnAsc(eq(FLIGHT_ID), eq(epoch), eq(to));
        }
    }

    @Nested
    @DisplayName("getDroneTrackHistory")
    class GetDroneTrackHistory {

        @Test
        @DisplayName("whenTimeRangeNotSpecified_returnsAllDroneRecordsOrderedAsc")
        void whenTimeRangeNotSpecified_returnsAllDroneRecordsOrderedAsc() {
            when(telemetryRecordRepository.findByDroneIdOrderByCreatedOnAsc(DRONE_ID))
                    .thenReturn(List.of(testRecord));
            when(telemetryMapper.toVm(testRecord)).thenReturn(testRecordVm);

            List<TelemetryRecordVm> result = telemetryService.getDroneTrackHistory(DRONE_ID, null, null);

            assertThat(result).hasSize(1);
            assertThat(result.getFirst().droneId()).isEqualTo(DRONE_ID);
            verify(telemetryRecordRepository).findByDroneIdOrderByCreatedOnAsc(DRONE_ID);
        }

        @Test
        @DisplayName("whenBothFromAndToProvided_queriesCreatedOnBetweenOrderedAsc")
        void whenBothFromAndToProvided_queriesCreatedOnBetweenOrderedAsc() {
            ZonedDateTime from = ZonedDateTime.now().minusHours(2);
            ZonedDateTime to = ZonedDateTime.now();

            when(telemetryRecordRepository.findByDroneIdAndCreatedOnBetweenOrderByCreatedOnAsc(DRONE_ID, from, to))
                    .thenReturn(List.of(testRecord));
            when(telemetryMapper.toVm(testRecord)).thenReturn(testRecordVm);

            List<TelemetryRecordVm> result = telemetryService.getDroneTrackHistory(DRONE_ID, from, to);

            assertThat(result).hasSize(1);
            verify(telemetryRecordRepository).findByDroneIdAndCreatedOnBetweenOrderByCreatedOnAsc(DRONE_ID, from, to);
        }

        @Test
        @DisplayName("whenOnlyFromProvided_defaultsToCurrentTimeAndQueriesBetween")
        void whenOnlyFromProvided_defaultsToCurrentTimeAndQueriesBetween() {
            ZonedDateTime from = ZonedDateTime.now().minusHours(1);

            when(telemetryRecordRepository.findByDroneIdAndCreatedOnBetweenOrderByCreatedOnAsc(eq(DRONE_ID), eq(from), any(ZonedDateTime.class)))
                    .thenReturn(List.of(testRecord));
            when(telemetryMapper.toVm(testRecord)).thenReturn(testRecordVm);

            List<TelemetryRecordVm> result = telemetryService.getDroneTrackHistory(DRONE_ID, from, null);

            assertThat(result).hasSize(1);
            verify(telemetryRecordRepository).findByDroneIdAndCreatedOnBetweenOrderByCreatedOnAsc(eq(DRONE_ID), eq(from), any(ZonedDateTime.class));
        }

        @Test
        @DisplayName("whenOnlyToProvided_defaultsFromToUnixEpochAndQueriesBetween")
        void whenOnlyToProvided_defaultsFromToUnixEpochAndQueriesBetween() {
            ZonedDateTime to = ZonedDateTime.now();
            ZonedDateTime epoch = ZonedDateTime.of(1970, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC);

            when(telemetryRecordRepository.findByDroneIdAndCreatedOnBetweenOrderByCreatedOnAsc(eq(DRONE_ID), eq(epoch), eq(to)))
                    .thenReturn(List.of(testRecord));
            when(telemetryMapper.toVm(testRecord)).thenReturn(testRecordVm);

            List<TelemetryRecordVm> result = telemetryService.getDroneTrackHistory(DRONE_ID, null, to);

            assertThat(result).hasSize(1);
            verify(telemetryRecordRepository).findByDroneIdAndCreatedOnBetweenOrderByCreatedOnAsc(eq(DRONE_ID), eq(epoch), eq(to));
        }
    }
}

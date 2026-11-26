package com.utm.telemetry.service;

import com.utm.commonlibrary.constants.MessageCode;
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
import org.springframework.data.domain.PageRequest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
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
    private static final String DRONE_ID_2 = "drone-999-uuid";
    private static final String FLIGHT_ID = "flight-789-uuid";

    @Mock
    private TelemetryRecordRepository telemetryRecordRepository;

    @Mock
    private TelemetryMapper telemetryMapper;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;

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
                .altitudeAgl(65.0)
                .speed(12.0)
                .verticalSpeed(0.4)
                .heading(145.0)
                .pitch(1.5)
                .roll(-0.8)
                .yaw(145.0)
                .batteryPercentage(82.5)
                .batteryVoltage(22.4)
                .batteryTemperature(33.5)
                .batteryDischargeRate(18.0)
                .signalStrength(-62.0)
                .gpsHdop(0.8)
                .gpsSatellites(15)
                .flightMode("AUTO")
                .systemStatus("ACTIVE")
                .source("MAVLINK")
                .motorRpm(List.of(5200.0, 5210.0, 5195.0, 5205.0))
                .warnings(List.of("HIGH_WIND_GUST"))
                .errors(List.of())
                .recordedAt(ZonedDateTime.now())
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
                ZonedDateTime.now(),
                65.0,
                0.4,
                22.4,
                33.5,
                18.0,
                -62.0,
                0.8,
                15,
                "AUTO",
                "ACTIVE",
                "MAVLINK",
                List.of(5200.0, 5210.0, 5195.0, 5205.0),
                List.of("HIGH_WIND_GUST"),
                List.of()
        );
    }

    @Nested
    @DisplayName("ingestTelemetry")
    class IngestTelemetry {

        @Test
        @DisplayName("Should persist extended telemetry fields, broadcast to all topics, and cache")
        void ingestTelemetry_validPayloadWithExtendedFields_persistsAndBroadcasts() {
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
                    82.5,
                    null,
                    65.0,
                    0.4,
                    22.4,
                    33.5,
                    18.0,
                    -62.0,
                    0.8,
                    15,
                    "AUTO",
                    "ACTIVE",
                    "MAVLINK",
                    List.of(5200.0, 5210.0, 5195.0, 5205.0),
                    List.of("HIGH_WIND_GUST"),
                    List.of()
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
            assertThat(result.altitudeAgl()).isEqualTo(65.0);
            assertThat(result.verticalSpeed()).isEqualTo(0.4);
            assertThat(result.batteryPercentage()).isEqualTo(82.5);
            assertThat(result.batteryVoltage()).isEqualTo(22.4);
            assertThat(result.gpsSatellites()).isEqualTo(15);
            assertThat(result.flightMode()).isEqualTo("AUTO");
            assertThat(result.systemStatus()).isEqualTo("ACTIVE");
            assertThat(result.source()).isEqualTo("MAVLINK");
            assertThat(result.motorRpm()).containsExactly(5200.0, 5210.0, 5195.0, 5205.0);
            assertThat(result.warnings()).containsExactly("HIGH_WIND_GUST");

            verify(telemetryRecordRepository).saveAndFlush(testRecord);
            verify(messagingTemplate).convertAndSend("/topic/telemetry/live", testRecordVm);
            verify(messagingTemplate).convertAndSend("/topic/telemetry/drone/" + DRONE_ID, testRecordVm);
            verify(messagingTemplate).convertAndSend("/topic/telemetry/flight/" + FLIGHT_ID, testRecordVm);
            verify(kafkaTemplate).send(any(), eq(DRONE_ID), any());
        }

        @Test
        @DisplayName("Should persist minimal legacy payload without flightId and broadcast only to live and drone topics")
        void ingestTelemetry_payloadWithoutFlightId_broadcastsOnlyToLiveAndDroneTopics() {
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
        @DisplayName("Should catch WebSocket broadcast failure and return persisted record")
        void ingestTelemetry_webSocketBroadcastFails_returnsResultSuccessfully() {
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
    @DisplayName("ingestTelemetryBatch")
    class IngestTelemetryBatchTests {

        @Test
        @DisplayName("Should save batch records, update cache, broadcast WebSocket, and publish Kafka events")
        void ingestTelemetryBatch_validBatch_savesAllAndBroadcasts() {
            TelemetryIngestVm item1 = new TelemetryIngestVm(
                    DRONE_ID, FLIGHT_ID, 10.7769, 106.7009, 85.5, 12.0, 145.0, 1.5, -0.8, 145.0, 82.5);
            TelemetryIngestVm item2 = new TelemetryIngestVm(
                    DRONE_ID_2, null, 10.7800, 106.7050, 90.0, 14.0, 90.0, 0.0, 0.0, 90.0, 76.0);

            TelemetryRecord record2 = TelemetryRecord.builder()
                    .id("record-999-uuid")
                    .droneId(DRONE_ID_2)
                    .latitude(10.7800)
                    .longitude(106.7050)
                    .altitude(90.0)
                    .recordedAt(ZonedDateTime.now())
                    .build();

            TelemetryRecordVm vm2 = new TelemetryRecordVm(
                    "record-999-uuid", DRONE_ID_2, null, 10.7800, 106.7050, 90.0,
                    14.0, 90.0, 0.0, 0.0, 90.0, 76.0, ZonedDateTime.now());

            when(telemetryMapper.toEntity(item1)).thenReturn(testRecord);
            when(telemetryMapper.toEntity(item2)).thenReturn(record2);
            when(telemetryRecordRepository.saveAllAndFlush(List.of(testRecord, record2)))
                    .thenReturn(List.of(testRecord, record2));
            when(telemetryMapper.toVmList(List.of(testRecord, record2)))
                    .thenReturn(List.of(testRecordVm, vm2));

            List<TelemetryRecordVm> results = telemetryService.ingestTelemetryBatch(List.of(item1, item2));

            assertThat(results).hasSize(2);
            assertThat(results.get(0).droneId()).isEqualTo(DRONE_ID);
            assertThat(results.get(1).droneId()).isEqualTo(DRONE_ID_2);
            verify(telemetryRecordRepository).saveAllAndFlush(List.of(testRecord, record2));
            verify(messagingTemplate).convertAndSend("/topic/telemetry/drone/" + DRONE_ID, testRecordVm);
            verify(messagingTemplate).convertAndSend("/topic/telemetry/drone/" + DRONE_ID_2, vm2);
            verify(kafkaTemplate).send(any(), eq(DRONE_ID), eq(testRecordVm));
            verify(kafkaTemplate).send(any(), eq(DRONE_ID_2), eq(vm2));
        }

        @Test
        @DisplayName("Should return empty list without querying database when batch is empty")
        void ingestTelemetryBatch_emptyBatch_returnsEmptyList() {
            List<TelemetryRecordVm> results = telemetryService.ingestTelemetryBatch(List.of());

            assertThat(results).isEmpty();
            verify(telemetryRecordRepository, never()).saveAllAndFlush(anyList());
        }
    }

    @Nested
    @DisplayName("getActiveTelemetry")
    class GetActiveTelemetryTests {

        @Test
        @DisplayName("Should return active snapshots directly from cache when cache is warm")
        void getActiveTelemetry_warmCache_returnsCachedSnapshotsWithoutDbQuery() {
            TelemetryIngestVm ingestVm = new TelemetryIngestVm(
                    DRONE_ID, FLIGHT_ID, 10.7769, 106.7009, 85.5, 12.0, 145.0, 1.5, -0.8, 145.0, 82.5);
            when(telemetryMapper.toEntity(ingestVm)).thenReturn(testRecord);
            when(telemetryRecordRepository.saveAndFlush(testRecord)).thenReturn(testRecord);
            when(telemetryMapper.toVm(testRecord)).thenReturn(testRecordVm);

            telemetryService.ingestTelemetry(ingestVm);

            List<TelemetryRecordVm> active = telemetryService.getActiveTelemetry();

            assertThat(active).hasSize(1);
            assertThat(active.getFirst().droneId()).isEqualTo(DRONE_ID);
            verify(telemetryRecordRepository, never())
                    .findByRecordedAtGreaterThanEqualOrderByRecordedAtDesc(any(), any());
        }

        @Test
        @DisplayName("Should fall back to recent database records within 5 minutes and deduplicate per drone when cache is cold")
        void getActiveTelemetry_coldCache_queriesRecentDbRecordsAndDeduplicatesPerDrone() {
            TelemetryRecord olderRecordSameDrone = TelemetryRecord.builder()
                    .id("record-older-uuid")
                    .droneId(DRONE_ID)
                    .latitude(10.7700)
                    .longitude(106.7000)
                    .altitude(80.0)
                    .recordedAt(ZonedDateTime.now().minusMinutes(2))
                    .build();

            when(telemetryRecordRepository.findByRecordedAtGreaterThanEqualOrderByRecordedAtDesc(
                    any(ZonedDateTime.class), eq(PageRequest.of(0, 5000))))
                    .thenReturn(List.of(testRecord, olderRecordSameDrone));
            when(telemetryMapper.toVmList(List.of(testRecord))).thenReturn(List.of(testRecordVm));

            List<TelemetryRecordVm> active = telemetryService.getActiveTelemetry();

            assertThat(active).hasSize(1);
            assertThat(active.getFirst().id()).isEqualTo(RECORD_ID);
            assertThat(active.getFirst().droneId()).isEqualTo(DRONE_ID);
            verify(telemetryMapper).toVmList(List.of(testRecord));
        }
    }

    @Nested
    @DisplayName("getLatestByDroneId")
    class GetLatestByDroneId {

        @Test
        @DisplayName("whenCacheMissAndFoundInDatabase_returnsMappedVmAndCaches")
        void whenCacheMissAndFoundInDatabase_returnsMappedVmAndCaches() {
            when(telemetryRecordRepository.findTopByDroneIdOrderByRecordedAtDesc(DRONE_ID))
                    .thenReturn(Optional.of(testRecord));
            when(telemetryMapper.toVm(testRecord)).thenReturn(testRecordVm);

            TelemetryRecordVm result = telemetryService.getLatestByDroneId(DRONE_ID);
            TelemetryRecordVm cachedResult = telemetryService.getLatestByDroneId(DRONE_ID);

            assertThat(result).isNotNull();
            assertThat(result.droneId()).isEqualTo(DRONE_ID);
            assertThat(cachedResult).isSameAs(result);
            verify(telemetryRecordRepository).findTopByDroneIdOrderByRecordedAtDesc(DRONE_ID);
        }

        @Test
        @DisplayName("whenNotFoundInCacheOrDatabase_throwsNotFoundException")
        void whenNotFoundInCacheOrDatabase_throwsNotFoundException() {
            when(telemetryRecordRepository.findTopByDroneIdOrderByRecordedAtDesc("unknown-drone"))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> telemetryService.getLatestByDroneId("unknown-drone"))
                    .isInstanceOf(NotFoundException.class)
                    .satisfies(ex -> {
                        NotFoundException nfe = (NotFoundException) ex;
                        assertThat(nfe.getErrorCode()).isEqualTo(MessageCode.TELEMETRY_NOT_FOUND);
                        assertThat(nfe.getParams()).containsEntry("droneId", "unknown-drone");
                    });
        }
    }

    @Nested
    @DisplayName("getLatestByFlightId")
    class GetLatestByFlightId {

        @Test
        @DisplayName("whenCacheMissAndFoundInDatabase_returnsMappedVmAndCaches")
        void whenCacheMissAndFoundInDatabase_returnsMappedVmAndCaches() {
            when(telemetryRecordRepository.findTopByFlightIdOrderByRecordedAtDesc(FLIGHT_ID))
                    .thenReturn(Optional.of(testRecord));
            when(telemetryMapper.toVm(testRecord)).thenReturn(testRecordVm);

            TelemetryRecordVm result = telemetryService.getLatestByFlightId(FLIGHT_ID);
            TelemetryRecordVm cachedResult = telemetryService.getLatestByFlightId(FLIGHT_ID);

            assertThat(result).isNotNull();
            assertThat(result.flightId()).isEqualTo(FLIGHT_ID);
            assertThat(cachedResult).isSameAs(result);
            verify(telemetryRecordRepository).findTopByFlightIdOrderByRecordedAtDesc(FLIGHT_ID);
        }

        @Test
        @DisplayName("whenNotFoundInCacheOrDatabase_throwsNotFoundException")
        void whenNotFoundInCacheOrDatabase_throwsNotFoundException() {
            when(telemetryRecordRepository.findTopByFlightIdOrderByRecordedAtDesc("unknown-flight"))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> telemetryService.getLatestByFlightId("unknown-flight"))
                    .isInstanceOf(NotFoundException.class)
                    .satisfies(ex -> {
                        NotFoundException nfe = (NotFoundException) ex;
                        assertThat(nfe.getErrorCode()).isEqualTo(MessageCode.TELEMETRY_NOT_FOUND);
                        assertThat(nfe.getParams()).containsEntry("flightId", "unknown-flight");
                    });
        }
    }

    @Nested
    @DisplayName("getFlightTrackHistory")
    class GetFlightTrackHistory {

        @Test
        @DisplayName("whenTimeRangeNotSpecified_returnsBoundedFlightRecordsOrderedAsc")
        void whenTimeRangeNotSpecified_returnsAllFlightRecordsOrderedAsc() {
            when(telemetryRecordRepository.findByFlightIdOrderByRecordedAtAsc(FLIGHT_ID, PageRequest.of(0, 5000)))
                    .thenReturn(List.of(testRecord));
            when(telemetryMapper.toVmList(List.of(testRecord))).thenReturn(List.of(testRecordVm));

            List<TelemetryRecordVm> result = telemetryService.getFlightTrackHistory(FLIGHT_ID, null, null);

            assertThat(result).hasSize(1);
            assertThat(result.getFirst().flightId()).isEqualTo(FLIGHT_ID);
            verify(telemetryRecordRepository).findByFlightIdOrderByRecordedAtAsc(FLIGHT_ID, PageRequest.of(0, 5000));
            verify(telemetryMapper).toVmList(List.of(testRecord));
        }

        @Test
        @DisplayName("whenBothFromAndToProvided_queriesRecordedAtBetweenOrderedAscWithCap")
        void whenBothFromAndToProvided_queriesCreatedOnBetweenOrderedAsc() {
            ZonedDateTime from = ZonedDateTime.now().minusHours(2);
            ZonedDateTime to = ZonedDateTime.now();

            when(telemetryRecordRepository.findByFlightIdAndRecordedAtBetweenOrderByRecordedAtAsc(
                    FLIGHT_ID, from, to, PageRequest.of(0, 5000)))
                    .thenReturn(List.of(testRecord));
            when(telemetryMapper.toVmList(List.of(testRecord))).thenReturn(List.of(testRecordVm));

            List<TelemetryRecordVm> result = telemetryService.getFlightTrackHistory(FLIGHT_ID, from, to);

            assertThat(result).hasSize(1);
            verify(telemetryRecordRepository).findByFlightIdAndRecordedAtBetweenOrderByRecordedAtAsc(
                    FLIGHT_ID, from, to, PageRequest.of(0, 5000));
        }

        @Test
        @DisplayName("whenOnlyFromProvided_defaultsToCurrentTimeAndQueriesBetween")
        void whenOnlyFromProvided_defaultsToCurrentTimeAndQueriesBetween() {
            ZonedDateTime from = ZonedDateTime.now().minusHours(1);

            when(telemetryRecordRepository.findByFlightIdAndRecordedAtBetweenOrderByRecordedAtAsc(
                    eq(FLIGHT_ID), eq(from), any(ZonedDateTime.class), eq(PageRequest.of(0, 5000))))
                    .thenReturn(List.of(testRecord));
            when(telemetryMapper.toVmList(List.of(testRecord))).thenReturn(List.of(testRecordVm));

            List<TelemetryRecordVm> result = telemetryService.getFlightTrackHistory(FLIGHT_ID, from, null);

            assertThat(result).hasSize(1);
            verify(telemetryRecordRepository).findByFlightIdAndRecordedAtBetweenOrderByRecordedAtAsc(
                    eq(FLIGHT_ID), eq(from), any(ZonedDateTime.class), eq(PageRequest.of(0, 5000)));
        }

        @Test
        @DisplayName("whenOnlyToProvided_defaultsFromToUnixEpochAndQueriesBetween")
        void whenOnlyToProvided_defaultsFromToUnixEpochAndQueriesBetween() {
            ZonedDateTime to = ZonedDateTime.now();
            ZonedDateTime epoch = ZonedDateTime.of(1970, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC);

            when(telemetryRecordRepository.findByFlightIdAndRecordedAtBetweenOrderByRecordedAtAsc(
                    eq(FLIGHT_ID), eq(epoch), eq(to), eq(PageRequest.of(0, 5000))))
                    .thenReturn(List.of(testRecord));
            when(telemetryMapper.toVmList(List.of(testRecord))).thenReturn(List.of(testRecordVm));

            List<TelemetryRecordVm> result = telemetryService.getFlightTrackHistory(FLIGHT_ID, null, to);

            assertThat(result).hasSize(1);
            verify(telemetryRecordRepository).findByFlightIdAndRecordedAtBetweenOrderByRecordedAtAsc(
                    eq(FLIGHT_ID), eq(epoch), eq(to), eq(PageRequest.of(0, 5000)));
        }
    }

    @Nested
    @DisplayName("getDroneTrackHistory")
    class GetDroneTrackHistory {

        @Test
        @DisplayName("whenTimeRangeNotSpecified_returnsBoundedDroneRecordsOrderedAsc")
        void whenTimeRangeNotSpecified_returnsAllDroneRecordsOrderedAsc() {
            when(telemetryRecordRepository.findByDroneIdOrderByRecordedAtAsc(DRONE_ID, PageRequest.of(0, 5000)))
                    .thenReturn(List.of(testRecord));
            when(telemetryMapper.toVmList(List.of(testRecord))).thenReturn(List.of(testRecordVm));

            List<TelemetryRecordVm> result = telemetryService.getDroneTrackHistory(DRONE_ID, null, null);

            assertThat(result).hasSize(1);
            assertThat(result.getFirst().droneId()).isEqualTo(DRONE_ID);
            verify(telemetryRecordRepository).findByDroneIdOrderByRecordedAtAsc(DRONE_ID, PageRequest.of(0, 5000));
            verify(telemetryMapper).toVmList(List.of(testRecord));
        }

        @Test
        @DisplayName("whenBothFromAndToProvided_queriesRecordedAtBetweenOrderedAscWithCap")
        void whenBothFromAndToProvided_queriesCreatedOnBetweenOrderedAsc() {
            ZonedDateTime from = ZonedDateTime.now().minusHours(2);
            ZonedDateTime to = ZonedDateTime.now();

            when(telemetryRecordRepository.findByDroneIdAndRecordedAtBetweenOrderByRecordedAtAsc(
                    DRONE_ID, from, to, PageRequest.of(0, 5000)))
                    .thenReturn(List.of(testRecord));
            when(telemetryMapper.toVmList(List.of(testRecord))).thenReturn(List.of(testRecordVm));

            List<TelemetryRecordVm> result = telemetryService.getDroneTrackHistory(DRONE_ID, from, to);

            assertThat(result).hasSize(1);
            verify(telemetryRecordRepository).findByDroneIdAndRecordedAtBetweenOrderByRecordedAtAsc(
                    DRONE_ID, from, to, PageRequest.of(0, 5000));
        }

        @Test
        @DisplayName("whenOnlyFromProvided_defaultsToCurrentTimeAndQueriesBetween")
        void whenOnlyFromProvided_defaultsToCurrentTimeAndQueriesBetween() {
            ZonedDateTime from = ZonedDateTime.now().minusHours(1);

            when(telemetryRecordRepository.findByDroneIdAndRecordedAtBetweenOrderByRecordedAtAsc(
                    eq(DRONE_ID), eq(from), any(ZonedDateTime.class), eq(PageRequest.of(0, 5000))))
                    .thenReturn(List.of(testRecord));
            when(telemetryMapper.toVmList(List.of(testRecord))).thenReturn(List.of(testRecordVm));

            List<TelemetryRecordVm> result = telemetryService.getDroneTrackHistory(DRONE_ID, from, null);

            assertThat(result).hasSize(1);
            verify(telemetryRecordRepository).findByDroneIdAndRecordedAtBetweenOrderByRecordedAtAsc(
                    eq(DRONE_ID), eq(from), any(ZonedDateTime.class), eq(PageRequest.of(0, 5000)));
        }

        @Test
        @DisplayName("whenOnlyToProvided_defaultsFromToUnixEpochAndQueriesBetween")
        void whenOnlyToProvided_defaultsFromToUnixEpochAndQueriesBetween() {
            ZonedDateTime to = ZonedDateTime.now();
            ZonedDateTime epoch = ZonedDateTime.of(1970, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC);

            when(telemetryRecordRepository.findByDroneIdAndRecordedAtBetweenOrderByRecordedAtAsc(
                    eq(DRONE_ID), eq(epoch), eq(to), eq(PageRequest.of(0, 5000))))
                    .thenReturn(List.of(testRecord));
            when(telemetryMapper.toVmList(List.of(testRecord))).thenReturn(List.of(testRecordVm));

            List<TelemetryRecordVm> result = telemetryService.getDroneTrackHistory(DRONE_ID, null, to);

            assertThat(result).hasSize(1);
            verify(telemetryRecordRepository).findByDroneIdAndRecordedAtBetweenOrderByRecordedAtAsc(
                    eq(DRONE_ID), eq(epoch), eq(to), eq(PageRequest.of(0, 5000)));
        }
    }
}

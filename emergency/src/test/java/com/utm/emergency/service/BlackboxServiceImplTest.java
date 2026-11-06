package com.utm.emergency.service;

import com.utm.emergency.mapper.BlackboxEntryMapper;
import com.utm.emergency.model.BlackboxEntry;
import com.utm.emergency.repository.BlackboxEntryRepository;
import com.utm.emergency.viewmodel.blackbox.BlackboxEntryPostVm;
import com.utm.emergency.viewmodel.blackbox.BlackboxEntryVm;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: BlackboxServiceImpl (Specification-Driven)")
class BlackboxServiceImplTest {

    @Mock
    private BlackboxEntryRepository blackboxRepo;

    @Mock
    private BlackboxEntryMapper blackboxMapper;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private BlackboxServiceImpl blackboxService;

    @Captor
    private ArgumentCaptor<PageRequest> pageRequestCaptor;

    private BlackboxEntry createSampleEntry(String id, String flightId, String droneId, String incidentId) {
        BlackboxEntry entry = new BlackboxEntry();
        entry.setId(id);
        entry.setFlightId(flightId);
        entry.setDroneId(droneId);
        entry.setIncidentId(incidentId);
        entry.setTimestamp(ZonedDateTime.now(ZoneOffset.UTC));
        entry.setLatitude(10.762622);
        entry.setLongitude(106.660172);
        entry.setAltitudeMsl(120.5);
        entry.setAltitudeAgl(115.0);
        entry.setGroundSpeed(14.2);
        entry.setHeading(88.0);
        entry.setBatteryLevel(18.5);
        entry.setSignalStrength(95.0);
        entry.setEmergencyActive(incidentId != null);
        return entry;
    }

    private BlackboxEntryVm createSampleEntryVm(String id, String flightId, String droneId, String incidentId) {
        return new BlackboxEntryVm(
                id,
                flightId,
                droneId,
                incidentId,
                ZonedDateTime.now(ZoneOffset.UTC),
                10.762622,
                106.660172,
                120.5,
                115.0,
                null,
                null,
                null,
                14.2,
                null,
                88.0,
                18.5,
                null,
                null,
                95.0,
                null,
                null,
                null,
                null,
                null,
                null,
                incidentId != null,
                null,
                null,
                "AUTO",
                null,
                null,
                null,
                null,
                true,
                ZonedDateTime.now(ZoneOffset.UTC));
    }

    @Nested
    @DisplayName("recordEntry Endpoint Tests")
    class RecordEntryTests {

        @Test
        @DisplayName("recordEntry saves blackbox telemetry and broadcasts when incidentId is present")
        void recordEntry_withIncidentId_savesAndBroadcastsToIncidentTopic() {
            BlackboxEntryPostVm postVm = new BlackboxEntryPostVm(
                    "flight-100",
                    "drone-100",
                    "inc-500",
                    ZonedDateTime.now(ZoneOffset.UTC),
                    10.762622,
                    106.660172,
                    120.5,
                    115.0,
                    0.0,
                    0.0,
                    0.0,
                    14.2,
                    0.0,
                    88.0,
                    18.5,
                    22.2,
                    12.5,
                    95.0,
                    12,
                    1.1,
                    List.of(6000.0, 6000.0, 6000.0, 6000.0),
                    List.of(45.0, 46.0, 45.0, 47.0),
                    "LAND",
                    "LAND",
                    true,
                    "battery_critical",
                    "critical",
                    "LAND",
                    5.2,
                    180.0,
                    28.5,
                    65.0,
                    true);

            BlackboxEntry entity = createSampleEntry(null, "flight-100", "drone-100", "inc-500");
            BlackboxEntry saved = createSampleEntry("bb-001", "flight-100", "drone-100", "inc-500");
            BlackboxEntryVm expectedVm = createSampleEntryVm("bb-001", "flight-100", "drone-100", "inc-500");

            when(blackboxMapper.toEntity(postVm)).thenReturn(entity);
            when(blackboxRepo.save(entity)).thenReturn(saved);
            when(blackboxMapper.toVm(saved)).thenReturn(expectedVm);

            BlackboxEntryVm result = blackboxService.recordEntry(postVm);

            assertThat(result).isNotNull();
            assertThat(result.id()).isEqualTo("bb-001");
            assertThat(result.incidentId()).isEqualTo("inc-500");

            verify(blackboxRepo).save(entity);
            verify(messagingTemplate).convertAndSend(eq("/topic/emergency/blackbox/inc-500"), eq(expectedVm));
        }

        @Test
        @DisplayName("recordEntry saves blackbox entry and skips broadcast when incidentId is null")
        void recordEntry_withoutIncidentId_savesAndOmitsBroadcast() {
            BlackboxEntryPostVm postVm = new BlackboxEntryPostVm(
                    "flight-100",
                    "drone-100",
                    null,
                    ZonedDateTime.now(ZoneOffset.UTC),
                    10.762622,
                    106.660172,
                    120.5,
                    115.0,
                    null, null, null,
                    14.2, null, 88.0, 85.0,
                    null, null, 95.0, null, null,
                    null, null, null, null, false,
                    null, null, "AUTO", null, null, null, null, false);

            BlackboxEntry entity = createSampleEntry(null, "flight-100", "drone-100", null);
            BlackboxEntry saved = createSampleEntry("bb-002", "flight-100", "drone-100", null);
            BlackboxEntryVm expectedVm = createSampleEntryVm("bb-002", "flight-100", "drone-100", null);

            when(blackboxMapper.toEntity(postVm)).thenReturn(entity);
            when(blackboxRepo.save(entity)).thenReturn(saved);
            when(blackboxMapper.toVm(saved)).thenReturn(expectedVm);

            BlackboxEntryVm result = blackboxService.recordEntry(postVm);

            assertThat(result).isNotNull();
            verify(messagingTemplate, never()).convertAndSend(any(String.class), any(Object.class));
        }
    }

    @Nested
    @DisplayName("getIncidentBlackbox Endpoint Tests")
    class GetIncidentBlackboxTests {

        @Test
        @DisplayName("getIncidentBlackbox with date range queries repository between timestamps")
        void getIncidentBlackbox_withDateRange_queriesBetweenTimestamps() {
            String incidentId = "inc-200";
            ZonedDateTime from = ZonedDateTime.now(ZoneOffset.UTC).minusMinutes(10);
            ZonedDateTime to = ZonedDateTime.now(ZoneOffset.UTC);

            BlackboxEntry entry = createSampleEntry("bb-10", "flight-1", "drone-1", incidentId);
            BlackboxEntryVm vm = createSampleEntryVm("bb-10", "flight-1", "drone-1", incidentId);

            when(blackboxRepo.findByIncidentIdAndTimestampBetweenOrderByTimestampAsc(incidentId, from, to))
                    .thenReturn(List.of(entry));
            when(blackboxMapper.toVmList(List.of(entry))).thenReturn(List.of(vm));

            List<BlackboxEntryVm> results = blackboxService.getIncidentBlackbox(incidentId, from, to);

            assertThat(results).hasSize(1);
            assertThat(results.get(0).id()).isEqualTo("bb-10");
            verify(blackboxRepo).findByIncidentIdAndTimestampBetweenOrderByTimestampAsc(incidentId, from, to);
        }

        @Test
        @DisplayName("getIncidentBlackbox without date range queries all entries for incident")
        void getIncidentBlackbox_withoutDateRange_queriesAllEntries() {
            String incidentId = "inc-300";
            when(blackboxRepo.findByIncidentIdOrderByTimestampAsc(incidentId)).thenReturn(Collections.emptyList());
            when(blackboxMapper.toVmList(Collections.emptyList())).thenReturn(Collections.emptyList());

            List<BlackboxEntryVm> results = blackboxService.getIncidentBlackbox(incidentId, null, null);

            assertThat(results).isEmpty();
            verify(blackboxRepo).findByIncidentIdOrderByTimestampAsc(incidentId);
        }
    }

    @Nested
    @DisplayName("getFlightBlackbox Endpoint Tests")
    class GetFlightBlackboxTests {

        @Test
        @DisplayName("getFlightBlackbox with custom valid limit and date range applies pagination")
        void getFlightBlackbox_withValidLimitAndDates_appliesPagination() {
            String flightId = "flight-500";
            ZonedDateTime from = ZonedDateTime.now(ZoneOffset.UTC).minusHours(1);
            ZonedDateTime to = ZonedDateTime.now(ZoneOffset.UTC);

            BlackboxEntry entry = createSampleEntry("bb-20", flightId, "drone-1", null);
            BlackboxEntryVm vm = createSampleEntryVm("bb-20", flightId, "drone-1", null);

            when(blackboxRepo.findByFlightIdAndTimestampBetweenOrderByTimestampAsc(eq(flightId), eq(from), eq(to),
                    any(PageRequest.class)))
                    .thenReturn(List.of(entry));
            when(blackboxMapper.toVmList(List.of(entry))).thenReturn(List.of(vm));

            List<BlackboxEntryVm> results = blackboxService.getFlightBlackbox(flightId, from, to, 500);

            assertThat(results).hasSize(1);
            verify(blackboxRepo).findByFlightIdAndTimestampBetweenOrderByTimestampAsc(eq(flightId), eq(from), eq(to),
                    pageRequestCaptor.capture());
            assertThat(pageRequestCaptor.getValue().getPageSize()).isEqualTo(500);
        }

        @Test
        @DisplayName("getFlightBlackbox with non-positive or exceeding limit normalizes limit to 1000")
        void getFlightBlackbox_withInvalidLimit_normalizesToOneThousand() {
            String flightId = "flight-600";
            when(blackboxRepo.findByFlightIdOrderByTimestampAsc(eq(flightId), any(PageRequest.class)))
                    .thenReturn(Collections.emptyList());
            when(blackboxMapper.toVmList(Collections.emptyList())).thenReturn(Collections.emptyList());

            blackboxService.getFlightBlackbox(flightId, null, null, 9999);

            verify(blackboxRepo).findByFlightIdOrderByTimestampAsc(eq(flightId), pageRequestCaptor.capture());
            assertThat(pageRequestCaptor.getValue().getPageSize()).isEqualTo(1000);
        }
    }
}

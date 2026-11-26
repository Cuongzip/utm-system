package com.utm.telemetry.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.telemetry.mapper.TelemetryMapper;
import com.utm.telemetry.model.TelemetryRecord;
import com.utm.telemetry.repository.TelemetryRecordRepository;
import com.utm.telemetry.viewmodel.telemetry.TelemetryIngestVm;
import com.utm.telemetry.viewmodel.telemetry.TelemetryRecordVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelemetryServiceImpl implements TelemetryService {

    private static final int MAX_TRACK_RECORDS = 5000;
    private static final long ACTIVE_WINDOW_MINUTES = 5L;

    private final TelemetryRecordRepository telemetryRecordRepository;
    private final TelemetryMapper telemetryMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    private final Map<String, TelemetryRecordVm> latestByDroneCache = new ConcurrentHashMap<>();
    private final Map<String, TelemetryRecordVm> latestByFlightCache = new ConcurrentHashMap<>();

    @Value("${utm.kafka.topic.telemetry-ingest:utm.telemetry.ingest}")
    private String telemetryTopic;

    @Override
    @Transactional
    public TelemetryRecordVm ingestTelemetry(TelemetryIngestVm ingestVm) {
        TelemetryRecord record = prepareEntity(ingestVm);
        TelemetryRecord saved = telemetryRecordRepository.saveAndFlush(record);
        TelemetryRecordVm vm = telemetryMapper.toVm(saved);

        scheduleSideEffects(List.of(vm));
        return vm;
    }

    @Override
    @Transactional
    public List<TelemetryRecordVm> ingestTelemetryBatch(List<TelemetryIngestVm> batch) {
        if (batch == null || batch.isEmpty()) {
            return List.of();
        }
        List<TelemetryRecord> entities = new ArrayList<>(batch.size());
        for (TelemetryIngestVm ingestVm : batch) {
            entities.add(prepareEntity(ingestVm));
        }
        List<TelemetryRecord> saved = telemetryRecordRepository.saveAllAndFlush(entities);
        List<TelemetryRecordVm> vms = telemetryMapper.toVmList(saved);

        scheduleSideEffects(vms);
        return vms;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TelemetryRecordVm> getActiveTelemetry() {
        ZonedDateTime cutoff = ZonedDateTime.now().minusMinutes(ACTIVE_WINDOW_MINUTES);
        if (!latestByDroneCache.isEmpty()) {
            List<TelemetryRecordVm> activeCached = latestByDroneCache.values().stream()
                    .filter(vm -> vm != null && (vm.timestamp() == null || !vm.timestamp().isBefore(cutoff)))
                    .sorted(Comparator.comparing(
                            TelemetryRecordVm::timestamp,
                            Comparator.nullsLast(Comparator.reverseOrder())))
                    .toList();
            if (!activeCached.isEmpty()) {
                return activeCached;
            }
        }

        List<TelemetryRecord> recentRecords = telemetryRecordRepository
                .findByRecordedAtGreaterThanEqualOrderByRecordedAtDesc(cutoff, PageRequest.of(0, MAX_TRACK_RECORDS));
        if (recentRecords == null || recentRecords.isEmpty()) {
            return List.of();
        }

        Map<String, TelemetryRecord> latestPerDrone = new LinkedHashMap<>();
        for (TelemetryRecord record : recentRecords) {
            if (record != null && record.getDroneId() != null && !record.getDroneId().isBlank()) {
                latestPerDrone.putIfAbsent(record.getDroneId(), record);
            }
        }

        List<TelemetryRecordVm> vms = telemetryMapper.toVmList(new ArrayList<>(latestPerDrone.values()));
        if (vms != null) {
            for (TelemetryRecordVm vm : vms) {
                cacheLatest(vm);
            }
            return vms;
        }
        return List.of();
    }

    private TelemetryRecord prepareEntity(TelemetryIngestVm ingestVm) {
        TelemetryRecord record = telemetryMapper.toEntity(ingestVm);
        if (record.getFlightId() != null && record.getFlightId().isBlank()) {
            record.setFlightId(null);
        }
        if (record.getRecordedAt() == null) {
            record.setRecordedAt(ingestVm.recordedAt() != null ? ingestVm.recordedAt() : ZonedDateTime.now());
        }
        return record;
    }

    private void scheduleSideEffects(List<TelemetryRecordVm> vms) {
        if (vms == null || vms.isEmpty()) {
            return;
        }
        Runnable emitSideEffects = () -> {
            for (TelemetryRecordVm vm : vms) {
                cacheLatest(vm);
                broadcastTelemetry(vm);
                publishTelemetryToKafka(vm);
            }
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    emitSideEffects.run();
                }
            });
        } else {
            emitSideEffects.run();
        }
    }

    private void cacheLatest(TelemetryRecordVm vm) {
        if (vm == null) {
            return;
        }
        if (vm.droneId() != null && !vm.droneId().isBlank()) {
            latestByDroneCache.put(vm.droneId(), vm);
        }
        if (vm.flightId() != null && !vm.flightId().isBlank()) {
            latestByFlightCache.put(vm.flightId(), vm);
        }
    }

    private void publishTelemetryToKafka(TelemetryRecordVm vm) {
        try {
            kafkaTemplate.send(telemetryTopic, vm.droneId(), vm);
        } catch (Exception ex) {
            log.error("Failed to publish telemetry to Kafka topic '{}' for drone '{}': {}", telemetryTopic, vm.droneId(), ex.getMessage());
        }
    }

    private void broadcastTelemetry(TelemetryRecordVm vm) {
        try {
            messagingTemplate.convertAndSend("/topic/telemetry/live", vm);
            messagingTemplate.convertAndSend("/topic/telemetry/drone/" + vm.droneId(), vm);
            if (vm.flightId() != null && !vm.flightId().isBlank()) {
                messagingTemplate.convertAndSend("/topic/telemetry/flight/" + vm.flightId(), vm);
            }
        } catch (Exception ex) {
            log.error("Failed to broadcast telemetry via WebSocket for drone '{}': {}", vm.droneId(), ex.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public TelemetryRecordVm getLatestByDroneId(String droneId) {
        TelemetryRecordVm cached = latestByDroneCache.get(droneId);
        if (cached != null) {
            return cached;
        }
        TelemetryRecord record = telemetryRecordRepository.findTopByDroneIdOrderByRecordedAtDesc(droneId)
                .orElseThrow(() -> new NotFoundException(MessageCode.TELEMETRY_NOT_FOUND, "droneId", droneId));
        TelemetryRecordVm vm = telemetryMapper.toVm(record);
        cacheLatest(vm);
        return vm;
    }

    @Override
    @Transactional(readOnly = true)
    public TelemetryRecordVm getLatestByFlightId(String flightId) {
        TelemetryRecordVm cached = latestByFlightCache.get(flightId);
        if (cached != null) {
            return cached;
        }
        TelemetryRecord record = telemetryRecordRepository.findTopByFlightIdOrderByRecordedAtDesc(flightId)
                .orElseThrow(() -> new NotFoundException(MessageCode.TELEMETRY_NOT_FOUND, "flightId", flightId));
        TelemetryRecordVm vm = telemetryMapper.toVm(record);
        cacheLatest(vm);
        return vm;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TelemetryRecordVm> getFlightTrackHistory(String flightId, ZonedDateTime from, ZonedDateTime to) {
        if (from != null && to == null) {
            to = ZonedDateTime.now();
        } else if (from == null && to != null) {
            from = ZonedDateTime.of(1970, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC);
        }

        PageRequest cap = PageRequest.of(0, MAX_TRACK_RECORDS);
        List<TelemetryRecord> records;
        if (from != null && to != null) {
            records = telemetryRecordRepository.findByFlightIdAndRecordedAtBetweenOrderByRecordedAtAsc(
                    flightId, from, to, cap);
        } else {
            records = telemetryRecordRepository.findByFlightIdOrderByRecordedAtAsc(flightId, cap);
        }

        return telemetryMapper.toVmList(records);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TelemetryRecordVm> getDroneTrackHistory(String droneId, ZonedDateTime from, ZonedDateTime to) {
        if (from != null && to == null) {
            to = ZonedDateTime.now();
        } else if (from == null && to != null) {
            from = ZonedDateTime.of(1970, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC);
        }

        PageRequest cap = PageRequest.of(0, MAX_TRACK_RECORDS);
        List<TelemetryRecord> records;
        if (from != null && to != null) {
            records = telemetryRecordRepository.findByDroneIdAndRecordedAtBetweenOrderByRecordedAtAsc(
                    droneId, from, to, cap);
        } else {
            records = telemetryRecordRepository.findByDroneIdOrderByRecordedAtAsc(droneId, cap);
        }

        return telemetryMapper.toVmList(records);
    }
}

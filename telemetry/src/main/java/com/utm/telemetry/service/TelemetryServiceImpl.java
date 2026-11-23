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
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelemetryServiceImpl implements TelemetryService {

    private static final int MAX_UNBOUNDED_TRACK_RECORDS = 5000;

    private final TelemetryRecordRepository telemetryRecordRepository;
    private final TelemetryMapper telemetryMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${utm.kafka.topic.telemetry-ingest:utm.telemetry.ingest}")
    private String telemetryTopic;

    @Override
    @Transactional
    public TelemetryRecordVm ingestTelemetry(TelemetryIngestVm ingestVm) {
        TelemetryRecord record = telemetryMapper.toEntity(ingestVm);
        TelemetryRecord saved = telemetryRecordRepository.saveAndFlush(record);
        TelemetryRecordVm vm = telemetryMapper.toVm(saved);

        Runnable emitSideEffects = () -> {
            broadcastTelemetry(vm);
            publishTelemetryToKafka(vm);
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

        return vm;
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
        TelemetryRecord record = telemetryRecordRepository.findTopByDroneIdOrderByCreatedOnDesc(droneId)
                .orElseThrow(() -> new NotFoundException(MessageCode.TELEMETRY_NOT_FOUND, "droneId", droneId));
        return telemetryMapper.toVm(record);
    }

    @Override
    @Transactional(readOnly = true)
    public TelemetryRecordVm getLatestByFlightId(String flightId) {
        TelemetryRecord record = telemetryRecordRepository.findTopByFlightIdOrderByCreatedOnDesc(flightId)
                .orElseThrow(() -> new NotFoundException(MessageCode.TELEMETRY_NOT_FOUND, "flightId", flightId));
        return telemetryMapper.toVm(record);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TelemetryRecordVm> getFlightTrackHistory(String flightId, ZonedDateTime from, ZonedDateTime to) {
        if (from != null && to == null) {
            to = ZonedDateTime.now();
        } else if (from == null && to != null) {
            from = ZonedDateTime.of(1970, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC);
        }

        List<TelemetryRecord> records;
        if (from != null && to != null) {
            records = telemetryRecordRepository.findByFlightIdAndCreatedOnBetweenOrderByCreatedOnAsc(flightId, from, to);
        } else {
            records = telemetryRecordRepository.findByFlightIdOrderByCreatedOnAsc(
                    flightId, PageRequest.of(0, MAX_UNBOUNDED_TRACK_RECORDS));
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

        List<TelemetryRecord> records;
        if (from != null && to != null) {
            records = telemetryRecordRepository.findByDroneIdAndCreatedOnBetweenOrderByCreatedOnAsc(droneId, from, to);
        } else {
            records = telemetryRecordRepository.findByDroneIdOrderByCreatedOnAsc(
                    droneId, PageRequest.of(0, MAX_UNBOUNDED_TRACK_RECORDS));
        }

        return telemetryMapper.toVmList(records);
    }
}


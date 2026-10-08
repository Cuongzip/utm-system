package com.utm.telemetry.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.telemetry.mapper.TelemetryMapper;
import com.utm.telemetry.model.TelemetryRecord;
import com.utm.telemetry.repository.TelemetryRecordRepository;
import com.utm.telemetry.viewmodel.TelemetryIngestVm;
import com.utm.telemetry.viewmodel.TelemetryRecordVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelemetryServiceImpl implements TelemetryService {

    private final TelemetryRecordRepository telemetryRecordRepository;
    private final TelemetryMapper telemetryMapper;
    private final SimpMessagingTemplate messagingTemplate;

    private final Map<String, TelemetryRecordVm> latestDroneTelemetryCache = new ConcurrentHashMap<>();
    private final Map<String, TelemetryRecordVm> latestFlightTelemetryCache = new ConcurrentHashMap<>();

    @Override
    @Transactional
    public TelemetryRecordVm ingestTelemetry(TelemetryIngestVm ingestVm) {
        TelemetryRecord record = telemetryMapper.toEntity(ingestVm);
        TelemetryRecord saved = telemetryRecordRepository.saveAndFlush(record);
        TelemetryRecordVm vm = telemetryMapper.toVm(saved);

        latestDroneTelemetryCache.put(vm.droneId(), vm);
        if (vm.flightId() != null && !vm.flightId().isBlank()) {
            latestFlightTelemetryCache.put(vm.flightId(), vm);
        }

        broadcastTelemetry(vm);

        return vm;
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
        TelemetryRecordVm cached = latestDroneTelemetryCache.get(droneId);
        if (cached != null) {
            return cached;
        }

        TelemetryRecord record = telemetryRecordRepository.findTopByDroneIdOrderByCreatedOnDesc(droneId)
                .orElseThrow(() -> new NotFoundException(MessageCode.TELEMETRY_NOT_FOUND, droneId));
        TelemetryRecordVm vm = telemetryMapper.toVm(record);
        latestDroneTelemetryCache.put(droneId, vm);
        return vm;
    }

    @Override
    @Transactional(readOnly = true)
    public TelemetryRecordVm getLatestByFlightId(String flightId) {
        TelemetryRecordVm cached = latestFlightTelemetryCache.get(flightId);
        if (cached != null) {
            return cached;
        }

        TelemetryRecord record = telemetryRecordRepository.findTopByFlightIdOrderByCreatedOnDesc(flightId)
                .orElseThrow(() -> new NotFoundException(MessageCode.TELEMETRY_NOT_FOUND, flightId));
        TelemetryRecordVm vm = telemetryMapper.toVm(record);
        latestFlightTelemetryCache.put(flightId, vm);
        return vm;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TelemetryRecordVm> getFlightTrackHistory(String flightId, ZonedDateTime from, ZonedDateTime to) {
        List<TelemetryRecord> records;
        if (from != null && to != null) {
            records = telemetryRecordRepository.findByFlightIdAndCreatedOnBetweenOrderByCreatedOnAsc(flightId, from, to);
        } else {
            records = telemetryRecordRepository.findByFlightIdOrderByCreatedOnAsc(flightId);
        }
        return records.stream()
                .map(telemetryMapper::toVm)
                .toList();
    }
}

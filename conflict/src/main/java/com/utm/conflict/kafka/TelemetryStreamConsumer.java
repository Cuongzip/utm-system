package com.utm.conflict.kafka;

import static com.utm.conflict.kafka.TelemetryKafkaListenerConfig.TELEMETRY_LISTENER_CONTAINER_FACTORY;

import com.utm.commonlibrary.kafka.cdc.BaseCdcConsumer;
import com.utm.commonlibrary.kafka.cdc.RetrySupportDql;
import com.utm.conflict.service.ConflictDetectionService;
import com.utm.conflict.viewmodel.client.TelemetryBriefVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.MessageHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Headers;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class TelemetryStreamConsumer extends BaseCdcConsumer<String, TelemetryBriefVm> {

    private final ConflictDetectionService conflictDetectionService;

    @KafkaListener(
            id = "conflict-detector",
            groupId = "conflict-detector",
            topics = "${utm.kafka.topic.telemetry-ingest:utm.telemetry.ingest}",
            containerFactory = TELEMETRY_LISTENER_CONTAINER_FACTORY
    )
    @RetrySupportDql(listenerContainerFactory = TELEMETRY_LISTENER_CONTAINER_FACTORY)
    public void processMessage(
            @Header(value = KafkaHeaders.RECEIVED_KEY, required = false) String key,
            @Payload(required = false) TelemetryBriefVm telemetry,
            @Headers MessageHeaders headers
    ) {
        processMessage(key, telemetry, headers, this::onTelemetryReceived);
    }

    public void onTelemetryReceived(String key, TelemetryBriefVm telemetry) {
        if (telemetry != null) {
            log.debug("Received live telemetry for flight/drone: {} (lat={}, lon={}, alt={})",
                    key, telemetry.latitude(), telemetry.longitude(), telemetry.altitude());
            conflictDetectionService.evaluateLiveTelemetry(telemetry);
        }
    }
}


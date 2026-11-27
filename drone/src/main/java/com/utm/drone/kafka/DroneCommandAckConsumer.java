package com.utm.drone.kafka;

import static com.utm.drone.kafka.DroneCommandAckKafkaListenerConfig.DRONE_COMMAND_ACK_LISTENER_FACTORY;

import com.utm.commonlibrary.kafka.cdc.BaseCdcConsumer;
import com.utm.commonlibrary.kafka.cdc.RetrySupportDql;
import com.utm.commonlibrary.kafka.event.DroneCommandAckEvent;
import com.utm.drone.model.enumeration.CommandStatus;
import com.utm.drone.repository.DroneCommandRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.MessageHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Headers;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class DroneCommandAckConsumer extends BaseCdcConsumer<String, DroneCommandAckEvent> {

    private final DroneCommandRepository droneCommandRepository;

    @KafkaListener(
            id = "drone-command-ack-consumer",
            groupId = "${spring.kafka.consumer.group-id:drone-service}",
            topics = "${utm.kafka.topic.drone-command-acks:utm.drone.command.acks}",
            containerFactory = DRONE_COMMAND_ACK_LISTENER_FACTORY
    )
    @RetrySupportDql(listenerContainerFactory = DRONE_COMMAND_ACK_LISTENER_FACTORY)
    public void processMessage(
            @Header(value = KafkaHeaders.RECEIVED_KEY, required = false) String key,
            @Payload(required = false) DroneCommandAckEvent ack,
            @Headers MessageHeaders headers
    ) {
        processMessage(key, ack, headers, this::onCommandAckReceived);
    }

    @Transactional
    public void onCommandAckReceived(String key, DroneCommandAckEvent ack) {
        if (ack == null || ack.commandId() == null || ack.status() == null) {
            return;
        }
        droneCommandRepository.findById(ack.commandId()).ifPresent(cmd -> {
            if (cmd.getStatus() == CommandStatus.COMPLETED
                    || cmd.getStatus() == CommandStatus.FAILED
                    || cmd.getStatus() == CommandStatus.CANCELLED) {
                return;
            }
            CommandStatus nextStatus = CommandStatus.fromValue(ack.status());
            if (nextStatus == null || statusRank(nextStatus) <= statusRank(cmd.getStatus())) {
                return;
            }
            cmd.setStatus(nextStatus);
            ZonedDateTime ts = ack.timestamp() != null ? ack.timestamp() : ZonedDateTime.now();
            if ((nextStatus == CommandStatus.ACKNOWLEDGED
                    || nextStatus == CommandStatus.EXECUTING
                    || nextStatus == CommandStatus.COMPLETED)
                    && cmd.getAcknowledgedAt() == null) {
                cmd.setAcknowledgedAt(ts);
            }
            if (nextStatus == CommandStatus.COMPLETED) {
                cmd.setCompletedAt(ts);
            } else if (nextStatus == CommandStatus.FAILED || nextStatus == CommandStatus.CANCELLED) {
                cmd.setCompletedAt(ts);
                if (ack.message() != null && !ack.message().isBlank()) {
                    cmd.setErrorMessage(ack.message());
                }
            }
            if (ack.retryCount() != null) {
                cmd.setRetryCount(ack.retryCount());
            }
            droneCommandRepository.save(cmd);
        });
    }

    private static int statusRank(CommandStatus status) {
        if (status == null) {
            return -1;
        }
        return switch (status) {
            case PENDING -> 0;
            case SENT -> 1;
            case ACKNOWLEDGED -> 2;
            case EXECUTING -> 3;
            case COMPLETED, FAILED, CANCELLED -> 4;
        };
    }
}

package com.utm.commonlibrary.kafka.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.ZonedDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DroneCommandAckEvent(
        String commandId,
        String droneId,
        String flightId,
        String commandType,
        String status,
        Integer retryCount,
        String message,
        ZonedDateTime timestamp
) {
}

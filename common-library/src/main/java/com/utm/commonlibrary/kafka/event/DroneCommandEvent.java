package com.utm.commonlibrary.kafka.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.ZonedDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DroneCommandEvent(
        String commandId,
        String droneId,
        String flightId,
        String commandType,
        Integer priority,
        String parameters,
        String status,
        ZonedDateTime timestamp
) {
}

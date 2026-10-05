package com.utm.flight.viewmodel;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.ZonedDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TelemetryRecordVm(
        String id,
        String droneId,
        String flightId,
        Double latitude,
        Double longitude,
        Double altitude,
        Double speed,
        Double heading,
        Double pitch,
        Double roll,
        Double yaw,
        Double batteryPercentage,
        @JsonAlias({"timestamp", "createdOn"})
        ZonedDateTime timestamp
) {
    public ZonedDateTime getEffectiveTimestamp() {
        return timestamp != null ? timestamp : ZonedDateTime.now();
    }
}

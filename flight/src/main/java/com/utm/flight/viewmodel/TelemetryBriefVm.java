package com.utm.flight.viewmodel;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "Brief flight telemetry GPS position and dynamics")
public record TelemetryBriefVm(
        @Schema(description = "GPS Latitude coordinate", example = "10.7769")
        Double latitude,

        @Schema(description = "GPS Longitude coordinate", example = "106.7009")
        Double longitude,

        @Schema(description = "Altitude MSL in meters", example = "120.0")
        Double altitude,

        @Schema(description = "Ground speed in m/s", example = "15.5")
        Double speed,

        @Schema(description = "Heading in degrees (0-360)", example = "45.0")
        Double heading,

        @Schema(description = "Telemetry timestamp")
        @JsonAlias({"timestamp", "createdOn"})
        ZonedDateTime timestamp
) {
    public ZonedDateTime getEffectiveTimestamp() {
        return timestamp != null ? timestamp : ZonedDateTime.now();
    }
}

package com.utm.flight.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.ZonedDateTime;

@Schema(description = "Instantaneous 4D flight conformance evaluation details")
public record FlightConformanceVm(
        @Schema(description = "Associated flight plan UUID identifier")
        String flightId,

        @Schema(description = "Conformance status: conformant, non_conforming, contingent, unknown")
        String status,

        @Schema(description = "Lateral deviation distance from designated route corridor in meters")
        Double crossTrackErrorM,

        @Schema(description = "Vertical altitude deviation error in meters")
        Double verticalErrorM,

        @Schema(description = "Permitted lateral flight corridor buffer radius in meters")
        Double corridorRadiusM,

        @Schema(description = "Permitted vertical altitude buffer in meters")
        Double altitudeBufferM,

        @Schema(description = "Last known drone latitude")
        Double currentLatitude,

        @Schema(description = "Last known drone longitude")
        Double currentLongitude,

        @Schema(description = "Last known drone altitude in meters")
        Double currentAltitude,

        @Schema(description = "Last known drone ground speed in m/s")
        Double currentSpeed,

        @Schema(description = "Last known drone heading in degrees")
        Double currentHeading,

        @Schema(description = "Timestamp of the last telemetry packet received")
        ZonedDateTime lastTelemetryTime,

        @Schema(description = "Timestamp when conformance was evaluated")
        ZonedDateTime lastEvaluatedAt,

        @Schema(description = "JSON details of active breach violations")
        String violationsJson,

        @Schema(description = "Creation timestamp")
        ZonedDateTime createdOn,

        @Schema(description = "Last modification timestamp")
        ZonedDateTime lastModifiedOn
) {}

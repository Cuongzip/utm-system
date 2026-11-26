package com.utm.telemetry.viewmodel.telemetry;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;
import java.util.List;

@Schema(description = "Telemetry record representation")
public record TelemetryRecordVm(
        @Schema(description = "Unique ID of the telemetry record", example = "550e8400-e29b-41d4-a716-446655440000")
        String id,

        @Schema(description = "Unique identifier of the reporting drone", example = "550e8400-e29b-41d4-a716-446655440000")
        String droneId,

        @Schema(description = "Associated flight operation ID", example = "660e8400-e29b-41d4-a716-446655440001")
        String flightId,

        @Schema(description = "Instantaneous WGS84 Latitude", example = "10.7780")
        Double latitude,

        @Schema(description = "Instantaneous WGS84 Longitude", example = "106.7020")
        Double longitude,

        @Schema(description = "Current altitude above mean sea level in meters (m)", example = "85.2")
        Double altitude,

        @Schema(description = "Ground speed in meters per second (m/s)", example = "14.5")
        Double speed,

        @Schema(description = "Compass heading angle in degrees (0-360)", example = "45.0")
        Double heading,

        @Schema(description = "Pitch angle in degrees", example = "1.5")
        Double pitch,

        @Schema(description = "Roll angle in degrees", example = "-0.8")
        Double roll,

        @Schema(description = "Yaw angle in degrees", example = "45.0")
        Double yaw,

        @Schema(description = "Remaining battery percentage (0-100%)", example = "82.5")
        Double batteryPercentage,

        @Schema(description = "Telemetry record timestamp")
        ZonedDateTime timestamp,

        @Schema(description = "Altitude above ground level in meters (m)", example = "65.0")
        Double altitudeAgl,

        @Schema(description = "Vertical climb/descent rate in m/s", example = "0.5")
        Double verticalSpeed,

        @Schema(description = "Battery pack voltage in Volts (V)", example = "22.4")
        Double batteryVoltage,

        @Schema(description = "Battery cell temperature in Celsius", example = "34.2")
        Double batteryTemperature,

        @Schema(description = "Instantaneous battery discharge rate", example = "18.5")
        Double batteryDischargeRate,

        @Schema(description = "C2 radio link signal strength", example = "-65.0")
        Double signalStrength,

        @Schema(description = "GPS horizontal dilution of precision (HDOP)", example = "0.9")
        Double gpsHdop,

        @Schema(description = "Number of locked GPS/GNSS satellites", example = "14")
        Integer gpsSatellites,

        @Schema(description = "Autopilot flight mode", example = "AUTO")
        String flightMode,

        @Schema(description = "System health status", example = "ACTIVE")
        String systemStatus,

        @Schema(description = "Telemetry origin source", example = "SIMULATOR")
        String source,

        @Schema(description = "Per-motor rotational speed in RPM")
        List<Double> motorRpm,

        @Schema(description = "Active onboard warnings")
        List<String> warnings,

        @Schema(description = "Active onboard errors")
        List<String> errors
) {
    public TelemetryRecordVm(
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
            ZonedDateTime timestamp
    ) {
        this(id, droneId, flightId, latitude, longitude, altitude, speed, heading, pitch, roll, yaw,
                batteryPercentage, timestamp, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
    }
}

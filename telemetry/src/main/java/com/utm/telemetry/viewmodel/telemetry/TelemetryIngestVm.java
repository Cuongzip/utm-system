package com.utm.telemetry.viewmodel.telemetry;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.ZonedDateTime;
import java.util.List;

@Schema(description = "Payload for ingesting high-frequency drone telemetry data")
public record TelemetryIngestVm(
        @Schema(description = "Unique identifier of the reporting drone", example = "550e8400-e29b-41d4-a716-446655440000")
        @NotBlank(message = "Drone ID is required")
        String droneId,

        @Schema(description = "Associated flight operation ID if drone is in mission", example = "660e8400-e29b-41d4-a716-446655440001")
        String flightId,

        @Schema(description = "Instantaneous WGS84 Latitude", example = "10.7780")
        @NotNull(message = "Latitude is required")
        @DecimalMin(value = "-90.0", message = "Latitude must be >= -90")
        @DecimalMax(value = "90.0", message = "Latitude must be <= 90")
        Double latitude,

        @Schema(description = "Instantaneous WGS84 Longitude", example = "106.7020")
        @NotNull(message = "Longitude is required")
        @DecimalMin(value = "-180.0", message = "Longitude must be >= -180")
        @DecimalMax(value = "180.0", message = "Longitude must be <= 180")
        Double longitude,

        @Schema(description = "Current altitude above mean sea level in meters (m)", example = "85.2")
        @NotNull(message = "Altitude is required")
        Double altitude,

        @Schema(description = "Current ground speed in meters per second (m/s)", example = "14.5")
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
        @DecimalMin(value = "0.0", message = "Battery percentage must be >= 0")
        @DecimalMax(value = "100.0", message = "Battery percentage must be <= 100")
        Double batteryPercentage,

        @Schema(description = "Device/simulator capture timestamp (ISO-8601 UTC). Defaults to server receive time if omitted.")
        ZonedDateTime recordedAt,

        @Schema(description = "Altitude above ground level in meters (m)", example = "65.0")
        Double altitudeAgl,

        @Schema(description = "Vertical climb/descent rate in m/s (positive up)", example = "0.5")
        Double verticalSpeed,

        @Schema(description = "Battery pack voltage in Volts (V)", example = "22.4")
        Double batteryVoltage,

        @Schema(description = "Battery cell temperature in Celsius", example = "34.2")
        Double batteryTemperature,

        @Schema(description = "Instantaneous battery discharge rate in Watts or Amps", example = "18.5")
        Double batteryDischargeRate,

        @Schema(description = "C2 radio link signal strength (RSSI dBm or 0-100%)", example = "-65.0")
        Double signalStrength,

        @Schema(description = "GPS horizontal dilution of precision (HDOP)", example = "0.9")
        Double gpsHdop,

        @Schema(description = "Number of locked GPS/GNSS satellites", example = "14")
        Integer gpsSatellites,

        @Schema(description = "Autopilot flight mode (e.g., AUTO, GUIDED, LOITER, RTL)", example = "AUTO")
        @Size(max = 50, message = "Flight mode must not exceed 50 characters")
        String flightMode,

        @Schema(description = "MAVLink/system health status (e.g., ACTIVE, STANDBY, CRITICAL)", example = "ACTIVE")
        @Size(max = 50, message = "System status must not exceed 50 characters")
        String systemStatus,

        @Schema(description = "Telemetry origin source (e.g., MAVLINK, SIMULATOR, REMOTE_ID)", example = "SIMULATOR")
        @Size(max = 50, message = "Source must not exceed 50 characters")
        String source,

        @Schema(description = "Per-motor rotational speed in RPM")
        List<Double> motorRpm,

        @Schema(description = "Active onboard warning codes/messages")
        List<String> warnings,

        @Schema(description = "Active onboard error codes/messages")
        List<String> errors
) {
    public TelemetryIngestVm(
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
            Double batteryPercentage
    ) {
        this(droneId, flightId, latitude, longitude, altitude, speed, heading, pitch, roll, yaw, batteryPercentage,
                null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
    }

    public TelemetryIngestVm(
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
            ZonedDateTime recordedAt
    ) {
        this(droneId, flightId, latitude, longitude, altitude, speed, heading, pitch, roll, yaw, batteryPercentage,
                recordedAt, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
    }
}

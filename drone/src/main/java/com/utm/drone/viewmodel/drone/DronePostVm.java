package com.utm.drone.viewmodel.drone;

import com.utm.drone.model.enumeration.CommunicationProtocol;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

@Schema(description = "Request payload for registering a new Drone / UAS")
public record DronePostVm(
        @Size(min = 3, max = 50, message = "Registration number must be between 3 and 50 characters")
        @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Registration number must contain only alphanumeric characters, dashes, and underscores")
        String registrationNumber,

        @NotBlank(message = "Manufacturer is required")
        @Size(max = 100, message = "Manufacturer must not exceed 100 characters")
        String manufacturer,

        @NotBlank(message = "Model is required")
        @Size(max = 100, message = "Model must not exceed 100 characters")
        String model,

        String ownerId,
        String homeHubId,

        @NotNull(message = "Battery capacity is required")
        @Positive(message = "Battery capacity must be positive")
        Double batteryCapacityWh,

        @NotNull(message = "Max payload is required")
        @PositiveOrZero(message = "Max payload must be non-negative")
        Double maxPayload,

        String currentHubId,

        @PositiveOrZero(message = "Current battery percentage must be non-negative")
        @DecimalMax(value = "100.0", message = "Current battery percentage must not exceed 100")
        Double currentBatteryPct,

        @Positive(message = "Hover power must be positive")
        Double hoverPowerW,

        @Positive(message = "Cruise power must be positive")
        Double cruisePowerW,

        @Positive(message = "Cruise speed must be positive")
        Double cruiseSpeedMs,

        @Positive(message = "Battery health percentage must be positive")
        @DecimalMax(value = "100.0", message = "Battery health percentage must not exceed 100")
        Double batteryHealthPct,

        @Positive(message = "Wind tolerance must be positive")
        Double windToleranceMs,

        @Positive(message = "Max flight time must be positive")
        Integer maxFlightTimeMin,

        @Positive(message = "Max range must be positive")
        Double maxRangeM,

        @Size(max = 100, message = "Serial number must not exceed 100 characters")
        String serialNumber,

        @Positive(message = "Max altitude must be positive")
        Double maxAltitude,

        @Positive(message = "Max speed must be positive")
        Double maxSpeed,

        CommunicationProtocol communicationProtocol,
        String remoteId,
        List<String> capabilities,
        Map<String, Object> specifications,
        Map<String, Object> telemetryConfig,
        ZonedDateTime lastMaintenance,
        ZonedDateTime nextMaintenance
) {
    public DronePostVm(
            String registrationNumber,
            String manufacturer,
            String model,
            String ownerId,
            String homeHubId,
            Double batteryCapacityWh,
            Double maxPayload) {
        this(registrationNumber, manufacturer, model, ownerId, homeHubId, batteryCapacityWh, maxPayload,
                null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null);
    }

    public DronePostVm(
            String registrationNumber,
            String manufacturer,
            String model,
            String ownerId,
            String homeHubId,
            Double batteryCapacityWh,
            Double maxPayload,
            String currentHubId,
            Double currentBatteryPct,
            Double hoverPowerW,
            Double cruisePowerW,
            Double cruiseSpeedMs,
            Double batteryHealthPct,
            Double windToleranceMs,
            Integer maxFlightTimeMin,
            Double maxRangeM) {
        this(registrationNumber, manufacturer, model, ownerId, homeHubId, batteryCapacityWh, maxPayload,
                currentHubId, currentBatteryPct, hoverPowerW, cruisePowerW, cruiseSpeedMs,
                batteryHealthPct, windToleranceMs, maxFlightTimeMin, maxRangeM, null,
                null, null, null, null, null, null, null, null, null);
    }

    public DronePostVm(
            String registrationNumber,
            String manufacturer,
            String model,
            String ownerId,
            String homeHubId,
            Double batteryCapacityWh,
            Double maxPayload,
            String currentHubId,
            Double currentBatteryPct,
            Double hoverPowerW,
            Double cruisePowerW,
            Double cruiseSpeedMs,
            Double batteryHealthPct,
            Double windToleranceMs,
            Integer maxFlightTimeMin,
            Double maxRangeM,
            String serialNumber) {
        this(registrationNumber, manufacturer, model, ownerId, homeHubId, batteryCapacityWh, maxPayload,
                currentHubId, currentBatteryPct, hoverPowerW, cruisePowerW, cruiseSpeedMs,
                batteryHealthPct, windToleranceMs, maxFlightTimeMin, maxRangeM, serialNumber,
                null, null, null, null, null, null, null, null, null);
    }
}

package com.utm.drone.viewmodel.drone;

import com.utm.drone.model.enumeration.CommunicationProtocol;
import com.utm.drone.model.enumeration.DroneStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

@Schema(description = "Request payload for updating an existing Drone / UAS")
public record DronePutVm(
        String homeHubId,
        @Positive(message = "Battery capacity must be positive") Double batteryCapacityWh,
        @PositiveOrZero(message = "Max payload must be non-negative") Double maxPayload,
        DroneStatus status,
        String currentHubId,
        @PositiveOrZero(message = "Current battery percentage must be non-negative")
        @DecimalMax(value = "100.0", message = "Current battery percentage must not exceed 100")
        Double currentBatteryPct,
        @Positive(message = "Hover power must be positive") Double hoverPowerW,
        @Positive(message = "Cruise power must be positive") Double cruisePowerW,
        @Positive(message = "Cruise speed must be positive") Double cruiseSpeedMs,
        @Positive(message = "Battery health percentage must be positive")
        @DecimalMax(value = "100.0", message = "Battery health percentage must not exceed 100")
        Double batteryHealthPct,
        @Positive(message = "Wind tolerance must be positive") Double windToleranceMs,
        @Positive(message = "Max flight time must be positive") Integer maxFlightTimeMin,
        @Positive(message = "Max range must be positive") Double maxRangeM,
        @Size(max = 100, message = "Serial number must not exceed 100 characters") String serialNumber,
        @Positive(message = "Max altitude must be positive") Double maxAltitude,
        @Positive(message = "Max speed must be positive") Double maxSpeed,
        CommunicationProtocol communicationProtocol,
        String remoteId,
        List<String> capabilities,
        Map<String, Object> specifications,
        Map<String, Object> telemetryConfig,
        ZonedDateTime lastMaintenance,
        ZonedDateTime nextMaintenance
) {
    public DronePutVm(
            String homeHubId,
            Double batteryCapacityWh,
            Double maxPayload,
            DroneStatus status
    ) {
        this(homeHubId, batteryCapacityWh, maxPayload, status,
                null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null);
    }

    public DronePutVm(
            String homeHubId,
            Double batteryCapacityWh,
            Double maxPayload,
            DroneStatus status,
            String currentHubId,
            Double currentBatteryPct,
            Double hoverPowerW,
            Double cruisePowerW,
            Double cruiseSpeedMs,
            Double batteryHealthPct,
            Double windToleranceMs,
            Integer maxFlightTimeMin,
            Double maxRangeM
    ) {
        this(homeHubId, batteryCapacityWh, maxPayload, status, currentHubId, currentBatteryPct,
                hoverPowerW, cruisePowerW, cruiseSpeedMs, batteryHealthPct, windToleranceMs,
                maxFlightTimeMin, maxRangeM, null,
                null, null, null, null, null, null, null, null, null);
    }

    public DronePutVm(
            String homeHubId,
            Double batteryCapacityWh,
            Double maxPayload,
            DroneStatus status,
            String currentHubId,
            Double currentBatteryPct,
            Double hoverPowerW,
            Double cruisePowerW,
            Double cruiseSpeedMs,
            Double batteryHealthPct,
            Double windToleranceMs,
            Integer maxFlightTimeMin,
            Double maxRangeM,
            String serialNumber
    ) {
        this(homeHubId, batteryCapacityWh, maxPayload, status, currentHubId, currentBatteryPct,
                hoverPowerW, cruisePowerW, cruiseSpeedMs, batteryHealthPct, windToleranceMs,
                maxFlightTimeMin, maxRangeM, serialNumber,
                null, null, null, null, null, null, null, null, null);
    }
}

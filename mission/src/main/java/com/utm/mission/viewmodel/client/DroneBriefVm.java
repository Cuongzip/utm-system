package com.utm.mission.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DroneBriefVm(
        String id,
        String registrationNumber,
        String manufacturer,
        String model,
        String status,
        String homeHubId,
        String currentHubId,
        Double batteryCapacityWh,
        Double currentBatteryPct,
        Double maxPayload,
        Double hoverPowerW,
        Double cruisePowerW,
        Double cruiseSpeedMs,
        Double batteryHealthPct,
        Double windToleranceMs,
        Integer maxFlightTimeMin,
        Double maxRangeM,
        Double totalFlightHours,
        Integer totalFlights,
        List<String> capabilities
) {
    public DroneBriefVm(
            String id,
            String registrationNumber,
            String manufacturer,
            String model,
            String status,
            String homeHubId,
            String currentHubId,
            Double batteryCapacityWh,
            Double currentBatteryPct,
            Double maxPayload,
            Double hoverPowerW,
            Double cruisePowerW,
            Double cruiseSpeedMs,
            Double batteryHealthPct,
            Double windToleranceMs,
            Integer maxFlightTimeMin,
            Double maxRangeM,
            Double totalFlightHours,
            Integer totalFlights
    ) {
        this(id, registrationNumber, manufacturer, model, status, homeHubId, currentHubId,
                batteryCapacityWh, currentBatteryPct, maxPayload, hoverPowerW, cruisePowerW,
                cruiseSpeedMs, batteryHealthPct, windToleranceMs, maxFlightTimeMin, maxRangeM,
                totalFlightHours, totalFlights, List.of());
    }

    public DroneBriefVm(String id, String registrationNumber, String status, String homeHubId) {
        this(id, registrationNumber, null, null, status, homeHubId, homeHubId,
                500.0, 100.0, 3.0, 350.0, 280.0, 15.0, 100.0, 12.0, 40, 25000.0, 0.0, 0, List.of());
    }

    public DroneBriefVm(
            String id,
            String registrationNumber,
            String manufacturer,
            String model,
            String status,
            String homeHubId,
            Double batteryCapacityWh,
            Double maxPayload
    ) {
        this(id, registrationNumber, manufacturer, model, status, homeHubId, homeHubId,
                batteryCapacityWh, 100.0, maxPayload, 350.0, 280.0, 15.0, 100.0, 12.0, 40, 25000.0, 0.0, 0, List.of());
    }
}

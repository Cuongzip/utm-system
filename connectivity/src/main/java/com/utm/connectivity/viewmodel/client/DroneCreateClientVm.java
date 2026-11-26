package com.utm.connectivity.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DroneCreateClientVm(
        String registrationNumber,
        String manufacturer,
        String model,
        String ownerId,
        String homeHubId,
        Double batteryCapacityWh,
        Double maxPayload,
        Double cruiseSpeedMs,
        Integer maxFlightTimeMin,
        Double maxRangeM,
        String serialNumber
) {
}

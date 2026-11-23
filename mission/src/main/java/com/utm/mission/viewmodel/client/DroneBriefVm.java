package com.utm.mission.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DroneBriefVm(
        String id,
        String registrationNumber,
        String manufacturer,
        String model,
        String status,
        String homeHubId,
        Double batteryCapacityWh,
        Double maxPayload) {
    public DroneBriefVm(String id, String registrationNumber, String status, String homeHubId) {
        this(id, registrationNumber, null, null, status, homeHubId, 500.0, 3.0);
    }
}

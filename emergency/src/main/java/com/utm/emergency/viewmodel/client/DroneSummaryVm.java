package com.utm.emergency.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DroneSummaryVm(
        String id,
        String registrationNumber,
        String model,
        Double maxSpeed,
        Double batteryLevel) {
}

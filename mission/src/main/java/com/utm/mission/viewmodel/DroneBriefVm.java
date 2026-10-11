package com.utm.mission.viewmodel;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DroneBriefVm(
        String id,
        String registrationNumber,
        String status,
        String homeHubId
) {
}

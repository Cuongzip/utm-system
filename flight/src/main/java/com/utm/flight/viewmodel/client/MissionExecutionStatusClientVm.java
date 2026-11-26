package com.utm.flight.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MissionExecutionStatusClientVm(
        String id,
        String missionId,
        String status
) {
}

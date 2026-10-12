package com.utm.conflict.viewmodel;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TelemetryBriefVm(
        Double latitude,
        Double longitude,
        Double altitude,
        Double speed,
        Double heading
) {
}

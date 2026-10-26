package com.utm.conflict.viewmodel;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AirspaceCheckResponseVm(
        boolean safe,
        List<Object> violations
) {
}

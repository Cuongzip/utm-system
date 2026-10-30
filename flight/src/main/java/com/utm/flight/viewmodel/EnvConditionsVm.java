package com.utm.flight.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Environmental conditions for energy calculation")
public record EnvConditionsVm(
        Double windSpeedMs
) {
}

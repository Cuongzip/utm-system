package com.utm.flight.viewmodel.feasibility;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Environmental conditions for energy calculation")
public record EnvConditionsVm(
        Double windSpeedMs
) {
}


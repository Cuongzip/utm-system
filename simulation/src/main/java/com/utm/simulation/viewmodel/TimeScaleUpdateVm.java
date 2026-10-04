package com.utm.simulation.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Payload to update the time-scale acceleration factor of a simulation session")
public record TimeScaleUpdateVm(
        @Schema(description = "New time-scale multiplier between 0.1x and 20.0x", example = "5.0")
        @NotNull(message = "Time scale is required")
        @DecimalMin(value = "0.1", message = "Time scale must be at least 0.1")
        @DecimalMax(value = "20.0", message = "Time scale cannot exceed 20.0")
        Double timeScale
) {
}

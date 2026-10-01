package com.utm.airspace.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

@Schema(description = "Payload for multi-waypoint flight path airspace conflict check")
public record AirspaceCheckPathVm(
        @Schema(description = "Ordered list of 3D waypoint coordinates representing the flight route")
        @NotEmpty(message = "Points list cannot be empty")
        List<@Valid AirspaceCheckPointVm> points,

        @Schema(description = "Sampling interval step in meters (m) along polyline segments", example = "200.0", defaultValue = "200.0")
        Double spacingM
) {
    public Double spacingM() {
        return (spacingM != null && spacingM > 0) ? spacingM : 200.0;
    }
}

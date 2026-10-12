package com.utm.flight.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

@Schema(description = "GeoJSON LineString representation for 2D/3D flight route coordinates")
public record GeoJsonLineStringVm(
        @Schema(description = "GeoJSON geometry type", example = "LineString")
        @NotBlank(message = "Geometry type cannot be blank")
        String type,

        @Schema(description = "Array of trajectory coordinate points, where each point is [longitude, latitude] or [longitude, latitude, altitude]",
                example = "[[106.6909, 10.7769, 50.0], [106.7050, 10.7820, 80.0], [106.7120, 10.7890, 50.0]]")
        @NotEmpty(message = "Coordinates array cannot be empty")
        List<List<Double>> coordinates
) {
    public static GeoJsonLineStringVm empty() {
        return new GeoJsonLineStringVm("LineString", List.of());
    }

    public static GeoJsonLineStringVm of(List<List<Double>> coordinates) {
        return new GeoJsonLineStringVm("LineString", coordinates != null ? coordinates : List.of());
    }
}

package com.utm.simulation.viewmodel;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "GeoJSON LineString representation for 2D/3D flight route coordinates")
public record GeoJsonLineStringVm(
        @Schema(description = "GeoJSON geometry type", example = "LineString")
        String type,

        @Schema(description = "Array of trajectory coordinate points [longitude, latitude, altitude]",
                example = "[[106.6909, 10.7769, 50.0], [106.7050, 10.7820, 80.0]]")
        List<List<Double>> coordinates
) {
    public static GeoJsonLineStringVm empty() {
        return new GeoJsonLineStringVm("LineString", List.of());
    }

    public static GeoJsonLineStringVm of(List<List<Double>> coordinates) {
        return new GeoJsonLineStringVm("LineString", coordinates != null ? coordinates : List.of());
    }
}

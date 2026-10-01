package com.utm.airspace.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

@Schema(description = "GeoJSON Polygon representation for 2D/3D airspace spatial boundary")
public record GeoJsonPolygonVm(
        @Schema(description = "GeoJSON geometry type", example = "Polygon")
        @NotBlank(message = "Geometry type cannot be blank")
        String type,

        @Schema(description = "Array of linear ring coordinate arrays, where each coordinate is [longitude, latitude]", 
                example = "[[[23.720, 37.965], [23.735, 37.965], [23.735, 37.975], [23.720, 37.975], [23.720, 37.965]]]")
        @NotEmpty(message = "Coordinates array cannot be empty")
        List<List<List<Double>>> coordinates
) {
}

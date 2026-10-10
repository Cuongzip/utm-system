package com.utm.hub.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

@Schema(description = "WGS84 Geographical coordinates")
public record LocationVm(
        @Schema(description = "Latitude (-90 to 90)", example = "10.7769")
        @DecimalMin(value = "-90.0", message = "Latitude must be >= -90.0")
        @DecimalMax(value = "90.0", message = "Latitude must be <= 90.0")
        Double lat,

        @Schema(description = "Longitude (-180 to 180)", example = "106.7009")
        @DecimalMin(value = "-180.0", message = "Longitude must be >= -180.0")
        @DecimalMax(value = "180.0", message = "Longitude must be <= 180.0")
        Double lng
) {
}

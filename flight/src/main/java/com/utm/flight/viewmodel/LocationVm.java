package com.utm.flight.viewmodel;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;

@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "WGS84 Geographical coordinates")
public record LocationVm(
        @Schema(description = "Latitude (-90 to 90)", example = "10.7769")
        Double lat,

        @Schema(description = "Longitude (-180 to 180)", example = "106.7009")
        Double lng
) {
}

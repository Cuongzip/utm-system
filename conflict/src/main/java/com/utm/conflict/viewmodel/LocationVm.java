package com.utm.conflict.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "WGS84 Coordinates representation")
public record LocationVm(
        @Schema(description = "WGS84 Latitude", example = "10.7769")
        Double latitude,

        @Schema(description = "WGS84 Longitude", example = "106.7009")
        Double longitude
) {
}

package com.utm.flight.viewmodel.flight;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;

@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "WGS84 Geographical coordinates")
public record LocationVm(
        @Schema(description = "Latitude (-90 to 90)", example = "10.7769")
        @JsonAlias({"lat", "latitude"})
        Double latitude,

        @Schema(description = "Longitude (-180 to 180)", example = "106.7009")
        @JsonAlias({"lng", "lon", "longitude"})
        Double longitude
) {
    public Double lat() {
        return latitude;
    }

    public Double lng() {
        return longitude;
    }
}


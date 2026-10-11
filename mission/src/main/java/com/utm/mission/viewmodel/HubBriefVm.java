package com.utm.mission.viewmodel;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Brief summary of departure or arrival hub")
@JsonIgnoreProperties(ignoreUnknown = true)
public record HubBriefVm(
        @Schema(description = "Hub unique identifier", example = "550e8400-e29b-41d4-a716-446655440000")
        String id,

        @Schema(description = "Hub operational code", example = "HUB-SGN-01")
        String code,

        @Schema(description = "Hub name", example = "Tan Son Nhat Central Hub")
        String name,

        @Schema(description = "Hub GPS latitude", example = "10.8184")
        Double latitude,

        @Schema(description = "Hub GPS longitude", example = "106.6588")
        Double longitude,

        Location location
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Location(Double lat, Double lng) {}

    public Double latitude() {
        if (latitude != null) return latitude;
        if (location != null && location.lat() != null) return location.lat();
        return null;
    }

    public Double longitude() {
        if (longitude != null) return longitude;
        if (location != null && location.lng() != null) return location.lng();
        return null;
    }
}


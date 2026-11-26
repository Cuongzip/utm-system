package com.utm.mission.viewmodel.client;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Brief summary of departure, arrival, or stopover hub")
@JsonIgnoreProperties(ignoreUnknown = true)
public record HubBriefVm(
        @Schema(description = "Hub unique identifier", example = "550e8400-e29b-41d4-a716-446655440000")
        String id,

        @Schema(description = "Hub operational code", example = "HUB-SGN-01")
        String code,

        @Schema(description = "Hub name", example = "Tan Son Nhat Central Hub")
        String name,

        @Schema(description = "Hub GPS latitude", example = "10.8184")
        @JsonAlias({"lat", "latitude"})
        Double latitude,

        @Schema(description = "Hub GPS longitude", example = "106.6588")
        @JsonAlias({"lng", "lon", "longitude"})
        Double longitude,

        Location location,

        @Schema(description = "Hub operational status (active, maintenance, inactive)", example = "active")
        String status,

        @Schema(description = "Maximum simultaneous active drones allowed at this hub", example = "10")
        Integer maxSimultaneousDrones
) {
    public HubBriefVm(String id, String code, String name, Double latitude, Double longitude, Location location) {
        this(id, code, name, latitude, longitude, location, "active", null);
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Location(
            @JsonAlias({"lat", "latitude"}) Double latitude,
            @JsonAlias({"lng", "lon", "longitude"}) Double longitude
    ) {
        public Double lat() {
            return latitude;
        }

        public Double lng() {
            return longitude;
        }
    }

    public Double latitude() {
        if (latitude != null) {
            return latitude;
        }
        return location != null ? location.latitude() : null;
    }

    public Double longitude() {
        if (longitude != null) {
            return longitude;
        }
        return location != null ? location.longitude() : null;
    }

    public boolean isActive() {
        return status == null || status.isBlank() || "active".equalsIgnoreCase(status.trim());
    }
}

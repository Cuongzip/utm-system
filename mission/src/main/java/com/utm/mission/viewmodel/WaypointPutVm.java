package com.utm.mission.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.util.Map;

@Schema(description = "Request payload for updating an existing waypoint")
public record WaypointPutVm(
        @Schema(description = "Waypoint designation or semantic name", example = "Điểm rẽ cập nhật")
        @Size(max = 100, message = "Waypoint name must not exceed 100 characters")
        String name,

        @Schema(description = "GPS latitude (-90 to 90)", example = "10.7780")
        @Min(value = -90, message = "Latitude must be between -90 and 90")
        @Max(value = 90, message = "Latitude must be between -90 and 90")
        Double latitude,

        @Schema(description = "GPS longitude (-180 to 180)", example = "106.7020")
        @Min(value = -180, message = "Longitude must be between -180 and 180")
        @Max(value = 180, message = "Longitude must be between -180 and 180")
        Double longitude,

        @Schema(description = "Target flight altitude in meters (> 0)", example = "60.0")
        @DecimalMin(value = "0.0", inclusive = false, message = "Altitude must be greater than 0")
        Double altitude,

        @Schema(description = "Actions to execute at waypoint", example = "{\"type\": \"hover\", \"durationS\": 15}")
        Map<String, Object> actions,

        @Schema(description = "Flight conditions at waypoint", example = "{\"maxSpeed\": 20}")
        Map<String, Object> conditions
) {
}

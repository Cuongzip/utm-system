package com.utm.drone.viewmodel;

import com.utm.drone.model.enumeration.DroneStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

@Schema(description = "Request payload for updating an existing Drone / UAS")
public record DronePutVm(
        @Schema(description = "Identifier of newly assigned home hub station", example = "96683f5a-769f-44aa-b4d3-16c72f2fe0a4")
        String homeHubId,

        @Schema(description = "Updated rated battery capacity in Watt-hours (Wh)", example = "588.0")
        @Positive(message = "Battery capacity must be positive")
        Double batteryCapacityWh,

        @Schema(description = "Updated maximum payload capacity in kg", example = "2.7")
        @PositiveOrZero(message = "Max payload must be non-negative")
        Double maxPayload,

        @Schema(description = "Operational status of the drone (available, in_flight, maintenance, charging, offline)", example = "maintenance")
        DroneStatus status
) {
}

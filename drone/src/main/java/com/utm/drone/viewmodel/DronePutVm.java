package com.utm.drone.viewmodel;

import com.utm.drone.model.enumeration.DroneStatus;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Request payload for updating an existing Drone / UAS")
public record DronePutVm(
        @Schema(description = "Operational status of the drone (e.g. idle, active, maintenance, retired)", example = "maintenance")
        DroneStatus status,

        @Schema(description = "Identifier of newly assigned hub station", example = "hub-hcm-02")
        String currentHubId,

        @Schema(description = "Maintenance notes or technical remarks", example = "Completed scheduled 100-hour flight maintenance")
        String notes,

        @Schema(description = "Updated maximum speed in m/s", example = "23.0")
        Double maxSpeedMps,

        @Schema(description = "Updated maximum flight endurance in minutes", example = "55")
        Integer maxFlightTimeMin,

        @Schema(description = "Updated maximum payload capacity in kg", example = "2.7")
        Double maxPayloadKg
) {
}



package com.utm.drone.viewmodel;

import java.time.ZonedDateTime;

import com.utm.drone.model.Drone;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Detailed profile and specifications of a Drone / UAS")
public record DroneVm(
        @Schema(description = "Unique UUID identifier of the drone", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
        String id,

        @Schema(description = "Aircraft registration number / callsign", example = "SX-UAS-001")
        String registrationNumber,

        @Schema(description = "Model / airframe designation", example = "DJI Matrice 350 RTK")
        String model,

        @Schema(description = "Manufacturer name", example = "DJI")
        String manufacturer,

        @Schema(description = "Maximum horizontal speed in meters per second (m/s)", example = "23.0")
        Double maxSpeedMps,

        @Schema(description = "Maximum flight endurance in minutes", example = "55")
        Integer maxFlightTimeMin,

        @Schema(description = "Maximum payload capacity in kilograms (kg)", example = "2.7")
        Double maxPayloadKg,

        @Schema(description = "Current operational status", example = "idle")
        String status,

        @Schema(description = "Identifier of assigned hub station", example = "hub-hcm-01")
        String currentHubId,

        @Schema(description = "Technical notes or payload sensor description", example = "Equipped with Zenmuse H20T thermal sensor")
        String notes,

        @Schema(description = "Record creation timestamp", example = "2026-09-28T10:00:00Z")
        ZonedDateTime createdOn,

        @Schema(description = "Last modification timestamp", example = "2026-09-28T10:30:00Z")
        ZonedDateTime lastModifiedOn
) {

    public static DroneVm fromEntity(Drone drone) {
        if (drone == null) {
            return null;
        }
        return new DroneVm(
                drone.getId(),
                drone.getRegistrationNumber(),
                drone.getModel(),
                drone.getManufacturer(),
                drone.getMaxSpeedMps(),
                drone.getMaxFlightTimeMin(),
                drone.getMaxPayloadKg(),
                drone.getStatus() != null ? drone.getStatus().getValue() : null,
                drone.getCurrentHubId(),
                drone.getNotes(),
                drone.getCreatedOn(),
                drone.getLastModifiedOn());
    }
}

package com.utm.drone.viewmodel;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;

@Schema(description = "Detailed profile and specifications of a Drone / UAS")
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DroneVm(
        @Schema(description = "Unique UUID identifier of the drone", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
        String id,

        @Schema(description = "Aircraft registration number / callsign", example = "VN-UAV-001")
        String registrationNumber,

        @Schema(description = "Manufacturer name", example = "DJI")
        String manufacturer,

        @Schema(description = "Model / airframe designation", example = "Matrice 350 RTK")
        String model,

        @Schema(description = "Owner organization UUID identifier", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
        String ownerId,

        @Schema(description = "Base / Home hub UUID identifier", example = "96683f5a-769f-44aa-b4d3-16c72f2fe0a4")
        String homeHubId,

        @Schema(description = "Rated battery capacity in Watt-hours (Wh)", example = "588.0")
        Double batteryCapacityWh,

        @Schema(description = "Maximum payload capacity in kilograms (kg)", example = "2.7")
        Double maxPayload,

        @Schema(description = "Current operational status", example = "available")
        String status,

        @Schema(description = "Enriched details of the owner organization")
        OrganizationBriefVm owner,

        @Schema(description = "Enriched details of the home hub station")
        HubBriefVm homeHub,

        @Schema(description = "Enriched hardware connectivity and registration status")
        DeviceRegistrationBriefVm deviceRegistration,

        @Schema(description = "Record creation timestamp", example = "2026-09-28T10:00:00Z")
        ZonedDateTime createdOn,

        @Schema(description = "User or client ID that created the record", example = "admin")
        String createdBy,

        @Schema(description = "Last modification timestamp", example = "2026-09-28T10:30:00Z")
        ZonedDateTime lastModifiedOn,

        @Schema(description = "User or client ID that last modified the record", example = "admin")
        String lastModifiedBy
) {
}

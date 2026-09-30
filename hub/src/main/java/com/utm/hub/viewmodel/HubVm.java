package com.utm.hub.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;

@Schema(description = "Detailed profile and specifications of a Takeoff/Landing Hub or Vertiport")
public record HubVm(
        @Schema(description = "Unique UUID identifier of the Hub", example = "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
        String id,

        @Schema(description = "Display name of the Hub / Vertiport", example = "Athens Central Vertiport Alpha")
        String name,

        @Schema(description = "Unique identification code / callsign of the Hub", example = "HUB-ATH-01")
        String code,

        @Schema(description = "WGS84 Latitude coordinate", example = "37.983810")
        Double latitude,

        @Schema(description = "WGS84 Longitude coordinate", example = "23.727539")
        Double longitude,

        @Schema(description = "Altitude above mean sea level in meters (m)", example = "120.5")
        Double altitude,

        @Schema(description = "Maximum drone parking / handling capacity", example = "10")
        Integer capacity,

        @Schema(description = "Number of high-speed charging pads available", example = "4")
        Integer chargingPads,

        @Schema(description = "Current operational status of the Hub", example = "active")
        String status,

        @Schema(description = "Record creation timestamp", example = "2026-09-28T10:00:00Z")
        ZonedDateTime createdOn,

        @Schema(description = "Last modification timestamp", example = "2026-09-28T10:30:00Z")
        ZonedDateTime lastModifiedOn
) {
}

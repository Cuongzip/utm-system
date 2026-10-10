package com.utm.hub.viewmodel;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;
import java.util.List;

@Schema(description = "Detailed profile and specifications of a Takeoff/Landing Hub or Vertiport")
@JsonInclude(JsonInclude.Include.NON_NULL)
public record HubVm(
        @Schema(description = "Unique UUID identifier of the Hub", example = "96683f5a-769f-44aa-b4d3-16c72f2fe0a4")
        String id,

        @Schema(description = "Unique identification code / callsign of the Hub", example = "HUB-SGN-D1")
        String code,

        @Schema(description = "Display name of the Hub / Vertiport", example = "Trạm Trung Tâm Quận 1")
        String name,

        @Schema(description = "GPS Location coordinates")
        LocationVm location,

        @Schema(description = "Altitude MSL in meters (m)", example = "12.5")
        Double altitudeMsl,

        @Schema(description = "Airspace protection radius in meters", example = "1000.0")
        Double airspaceRadius,

        @Schema(description = "Current operational status of the Hub", example = "active")
        String status,

        @Schema(description = "Number of available drones currently docked at the Hub", example = "3")
        Long availableDronesCount,

        @Schema(description = "Airspace corridors associated with the Hub")
        List<String> corridors,

        @Schema(description = "Record creation timestamp", example = "2026-09-28T10:00:00Z")
        ZonedDateTime createdOn,

        @Schema(description = "Last modification timestamp", example = "2026-09-28T10:30:00Z")
        ZonedDateTime lastModifiedOn
) {
}

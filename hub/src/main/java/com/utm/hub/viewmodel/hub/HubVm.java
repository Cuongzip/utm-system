package com.utm.hub.viewmodel.hub;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.utm.hub.model.enumeration.HubStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;

@Schema(description = "Detailed profile and specifications of a Takeoff/Landing Hub or Vertiport")
@JsonInclude(JsonInclude.Include.NON_NULL)
public record HubVm(
        @Schema(description = "Unique UUID identifier of the Hub", example = "96683f5a-769f-44aa-b4d3-16c72f2fe0a4")
        String id,

        @Schema(description = "Unique identification code / callsign of the Hub", example = "HUB-SGN-01")
        String code,

        @Schema(description = "Display name of the Hub / Vertiport", example = "Trạm Trung Tâm Quận 1")
        String name,

        @Schema(description = "GPS Location coordinates")
        LocationVm location,

        @Schema(description = "Altitude MSL in meters (m)", example = "12.5")
        Double altitudeMsl,

        @Schema(description = "Airspace protection radius in meters", example = "1500.0")
        Double airspaceRadius,

        @Schema(description = "Current operational status of the Hub", example = "active")
        HubStatus status,

        @Schema(description = "Record creation timestamp", example = "2026-10-10T08:00:00Z")
        ZonedDateTime createdOn,

        @Schema(description = "Last modification timestamp", example = "2026-10-10T08:30:00Z")
        ZonedDateTime lastModifiedOn
) {
}

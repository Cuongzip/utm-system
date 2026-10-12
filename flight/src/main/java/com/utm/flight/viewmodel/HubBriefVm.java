package com.utm.flight.viewmodel;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;

@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "Brief summary and coordinates of Takeoff/Landing Hub retrieved from Hub Service")
public record HubBriefVm(
        @Schema(description = "Unique UUID identifier of the Hub", example = "96683f5a-769f-44aa-b4d3-16c72f2fe0a4")
        String id,

        @Schema(description = "Unique identification code / callsign of the Hub", example = "HUB-SGN-D1")
        String code,

        @Schema(description = "Display name of the Hub / Vertiport", example = "Central Vertiport Hub D1")
        String name,

        @Schema(description = "GPS Location coordinates")
        LocationVm location,

        @Schema(description = "Altitude MSL in meters (m)", example = "12.5")
        Double altitudeMsl
) {
}

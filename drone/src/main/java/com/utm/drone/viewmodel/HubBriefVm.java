package com.utm.drone.viewmodel;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;

@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "Brief summary of base hub / vertiport station")
public record HubBriefVm(
        @Schema(description = "Hub UUID identifier", example = "96683f5a-769f-44aa-b4d3-16c72f2fe0a4")
        String id,

        @Schema(description = "Hub callsign / identification code", example = "HUB-SGN-D1")
        String code,

        @Schema(description = "Hub display name", example = "Central Vertiport Hub D1")
        String name
) {
}

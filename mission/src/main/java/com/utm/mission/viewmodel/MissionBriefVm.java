package com.utm.mission.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Brief summary of mission for inter-service lookups")
public record MissionBriefVm(
        @Schema(description = "Mission UUID identifier", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
        String id,

        @Schema(description = "Mission name", example = "Nhiệm vụ giao hàng chặng Hub 1 - Hub 2")
        String name,

        @Schema(description = "Departure Hub UUID identifier", example = "550e8400-e29b-41d4-a716-446655440000")
        String departureHubId,

        @Schema(description = "Arrival Hub UUID identifier", example = "660e8400-e29b-41d4-a716-446655440001")
        String arrivalHubId,

        @Schema(description = "Mission operational status", example = "draft")
        String status
) {
}

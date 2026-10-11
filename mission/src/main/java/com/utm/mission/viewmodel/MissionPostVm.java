package com.utm.mission.viewmodel;

import com.utm.mission.model.enumeration.MissionScheduleType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.ZonedDateTime;

@Schema(description = "Request payload for creating a mission")
public record MissionPostVm(
        @Schema(description = "Mission name", example = "Nhiệm vụ giao hàng chặng Hub 1 - Hub 2")
        @NotBlank(message = "Mission name is required")
        @Size(max = 255, message = "Mission name must not exceed 255 characters")
        String name,

        @Schema(description = "Mission detailed description", example = "Giao bưu kiện nhẹ 1.2kg")
        String description,

        @Schema(description = "Departure Hub UUID identifier", example = "550e8400-e29b-41d4-a716-446655440000")
        @NotBlank(message = "Departure hub ID is required")
        String departureHubId,

        @Schema(description = "Arrival Hub UUID identifier", example = "660e8400-e29b-41d4-a716-446655440001")
        @NotBlank(message = "Arrival hub ID is required")
        String arrivalHubId,

        @Schema(description = "Mission schedule type ('immediate' or 'scheduled')", example = "immediate")
        MissionScheduleType scheduleType,

        @Schema(description = "Scheduled flight departure timestamp (required if scheduleType is scheduled)", example = "2026-10-15T08:00:00Z")
        ZonedDateTime scheduledAt
) {
}

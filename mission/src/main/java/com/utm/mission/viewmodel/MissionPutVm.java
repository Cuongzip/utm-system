package com.utm.mission.viewmodel;

import com.utm.mission.model.enumeration.MissionScheduleType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

import java.time.ZonedDateTime;

@Schema(description = "Request payload for updating an existing mission in draft status")
public record MissionPutVm(
        @Schema(description = "Mission name", example = "Nhiệm vụ giao hàng chặng Hub 1 - Hub 2 (Điều chỉnh)")
        @Size(max = 255, message = "Mission name must not exceed 255 characters")
        String name,

        @Schema(description = "Mission detailed description", example = "Giao bưu kiện nhẹ 1.5kg")
        String description,

        @Schema(description = "Departure Hub UUID identifier", example = "550e8400-e29b-41d4-a716-446655440000")
        String departureHubId,

        @Schema(description = "Arrival Hub UUID identifier", example = "660e8400-e29b-41d4-a716-446655440001")
        String arrivalHubId,

        @Schema(description = "Mission schedule type ('immediate' or 'scheduled')", example = "scheduled")
        MissionScheduleType scheduleType,

        @Schema(description = "Scheduled flight departure timestamp", example = "2026-10-16T09:00:00Z")
        ZonedDateTime scheduledAt
) {
}

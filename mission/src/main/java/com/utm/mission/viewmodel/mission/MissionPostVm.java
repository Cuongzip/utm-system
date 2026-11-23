package com.utm.mission.viewmodel.mission;

import com.utm.mission.model.enumeration.MissionScheduleType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.ZonedDateTime;

@Schema(description = "Request payload for creating a mission")
public record MissionPostVm(
        @Schema(description = "Mission business tracking code (e.g. MSN-YYMMDD-XXXX). If omitted or blank, auto-generated.", example = "MSN-261107-A4B2") @Size(min = 3, max = 50, message = "Mission code must be between 3 and 50 characters") @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Mission code must contain only alphanumeric characters, dashes, and underscores") String code,

        @Schema(description = "Mission name", example = "Nhiệm vụ giao hàng chặng Hub 1 - Hub 2") @NotBlank(message = "Mission name is required") @Size(min = 1, max = 255, message = "Mission name must be between 1 and 255 characters") String name,

        @Schema(description = "Mission detailed description", example = "Giao bưu kiện nhẹ 1.2kg") String description,

        @Schema(description = "Payload mass in kilograms to transport (required for delivery)", example = "1.5") @PositiveOrZero(message = "Payload weight must be positive or zero") @DecimalMax(value = "50.0", message = "Payload weight cannot exceed 50kg") Double payloadWeightKg,

        @Schema(description = "Departure Hub UUID identifier", example = "550e8400-e29b-41d4-a716-446655440000") @NotBlank(message = "Departure hub ID is required") String departureHubId,

        @Schema(description = "Arrival Hub UUID identifier", example = "660e8400-e29b-41d4-a716-446655440001") @NotBlank(message = "Arrival hub ID is required") String arrivalHubId,

        @Schema(description = "Mission schedule type ('immediate' or 'scheduled')", example = "immediate") MissionScheduleType scheduleType,

        @Schema(description = "Scheduled flight departure timestamp (required if scheduleType is scheduled)", example = "2026-10-15T08:00:00Z") ZonedDateTime scheduledAt) {
    public MissionPostVm(String code, String name, String description, String departureHubId, String arrivalHubId,
            MissionScheduleType scheduleType, ZonedDateTime scheduledAt) {
        this(code, name, description, 0.0, departureHubId, arrivalHubId, scheduleType, scheduledAt);
    }
}

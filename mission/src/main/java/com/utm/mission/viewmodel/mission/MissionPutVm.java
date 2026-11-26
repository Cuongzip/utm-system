package com.utm.mission.viewmodel.mission;

import com.utm.mission.model.enumeration.MissionScheduleType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

@Schema(description = "Request payload for updating an existing mission in draft status")
public record MissionPutVm(
        @Schema(description = "Mission name")
        @Size(min = 1, max = 255, message = "Mission name must be between 1 and 255 characters")
        String name,

        @Schema(description = "Mission detailed description")
        String description,

        @Schema(description = "Payload mass in kilograms to transport", example = "1.5")
        @PositiveOrZero(message = "Payload weight must be positive or zero")
        @DecimalMax(value = "50.0", message = "Payload weight cannot exceed 50kg")
        Double payloadWeightKg,

        @Schema(description = "Departure Hub UUID identifier")
        String departureHubId,

        @Schema(description = "Arrival Hub UUID identifier")
        String arrivalHubId,

        @Schema(description = "Mission schedule type")
        MissionScheduleType scheduleType,

        @Schema(description = "Scheduled flight departure timestamp")
        ZonedDateTime scheduledAt,

        @Schema(description = "Optional pre-assigned Drone UUID identifier")
        String droneId,

        @Schema(description = "Optional pre-assigned Remote Pilot ID")
        @Size(max = 100, message = "Pilot ID must not exceed 100 characters")
        String pilotId,

        @Schema(description = "Optional cron expression for recurring missions")
        @Size(max = 100, message = "Recurring pattern must not exceed 100 characters")
        String recurringPattern,

        @Schema(description = "Optional event trigger conditions")
        List<Map<String, Object>> triggerConditions,

        @Schema(description = "Optional required drone capabilities")
        List<String> requiredCapabilities,

        @Schema(description = "Optional feasibility override metadata")
        Map<String, Object> feasibilityOverride
) {
    public MissionPutVm(String name, String description, Double payloadWeightKg, String departureHubId,
            String arrivalHubId, MissionScheduleType scheduleType, ZonedDateTime scheduledAt,
            String droneId, String pilotId) {
        this(name, description, payloadWeightKg, departureHubId, arrivalHubId, scheduleType, scheduledAt,
                droneId, pilotId, null, null, null, null);
    }

    public MissionPutVm(String name, String description, Double payloadWeightKg, String departureHubId,
            String arrivalHubId, MissionScheduleType scheduleType, ZonedDateTime scheduledAt) {
        this(name, description, payloadWeightKg, departureHubId, arrivalHubId, scheduleType, scheduledAt,
                null, null, null, null, null, null);
    }

    public MissionPutVm(String name, String description, String departureHubId, String arrivalHubId,
            MissionScheduleType scheduleType, ZonedDateTime scheduledAt) {
        this(name, description, 0.0, departureHubId, arrivalHubId, scheduleType, scheduledAt,
                null, null, null, null, null, null);
    }
}

package com.utm.mission.viewmodel.mission;

import com.utm.mission.model.enumeration.MissionScheduleType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

@Schema(description = "Request payload for creating a mission")
public record MissionPostVm(
        @Schema(description = "Mission business tracking code (e.g. MSN-YYMMDD-XXXX). If omitted or blank, auto-generated.", example = "MSN-261107-A4B2")
        @Size(min = 3, max = 50, message = "Mission code must be between 3 and 50 characters")
        @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Mission code must contain only alphanumeric characters, dashes, and underscores")
        String code,

        @Schema(description = "Mission name", example = "Medical Supply Transport")
        @NotBlank(message = "Mission name is required")
        @Size(min = 1, max = 255, message = "Mission name must be between 1 and 255 characters")
        String name,

        @Schema(description = "Mission detailed description")
        String description,

        @Schema(description = "Payload mass in kilograms to transport", example = "1.5")
        @PositiveOrZero(message = "Payload weight must be positive or zero")
        @DecimalMax(value = "50.0", message = "Payload weight cannot exceed 50kg")
        Double payloadWeightKg,

        @Schema(description = "Departure Hub UUID identifier")
        @NotBlank(message = "Departure hub ID is required")
        String departureHubId,

        @Schema(description = "Arrival Hub UUID identifier")
        @NotBlank(message = "Arrival hub ID is required")
        String arrivalHubId,

        @Schema(description = "Mission schedule type ('immediate', 'manual', 'scheduled', 'recurring', 'event_triggered')", example = "immediate")
        MissionScheduleType scheduleType,

        @Schema(description = "Scheduled flight departure timestamp")
        ZonedDateTime scheduledAt,

        @Schema(description = "Optional pre-assigned Drone UUID identifier")
        String droneId,

        @Schema(description = "Optional pre-assigned Remote Pilot ID or Keycloak User ID")
        @Size(max = 100, message = "Pilot ID must not exceed 100 characters")
        String pilotId,

        @Schema(description = "Optional cron expression for recurring missions")
        @Size(max = 100, message = "Recurring pattern must not exceed 100 characters")
        String recurringPattern,

        @Schema(description = "Optional event trigger conditions")
        List<Map<String, Object>> triggerConditions,

        @Schema(description = "Optional required drone capabilities (e.g. payload_release, thermal_camera, bvlos)")
        List<String> requiredCapabilities,

        @Schema(description = "Optional pre-flight feasibility override metadata")
        Map<String, Object> feasibilityOverride
) {
    public MissionPostVm(String code, String name, String description, Double payloadWeightKg,
            String departureHubId, String arrivalHubId, MissionScheduleType scheduleType, ZonedDateTime scheduledAt,
            String droneId, String pilotId) {
        this(code, name, description, payloadWeightKg, departureHubId, arrivalHubId, scheduleType, scheduledAt,
                droneId, pilotId, null, null, null, null);
    }

    public MissionPostVm(String code, String name, String description, Double payloadWeightKg,
            String departureHubId, String arrivalHubId, MissionScheduleType scheduleType, ZonedDateTime scheduledAt) {
        this(code, name, description, payloadWeightKg, departureHubId, arrivalHubId, scheduleType, scheduledAt,
                null, null, null, null, null, null);
    }

    public MissionPostVm(String code, String name, String description, String departureHubId, String arrivalHubId,
            MissionScheduleType scheduleType, ZonedDateTime scheduledAt) {
        this(code, name, description, 0.0, departureHubId, arrivalHubId, scheduleType, scheduledAt,
                null, null, null, null, null, null);
    }
}

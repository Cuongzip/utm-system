package com.utm.mission.viewmodel.template;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.utm.mission.model.enumeration.MissionScheduleType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "Mission route & scheduling blueprint inside a Mission Template")
public record MissionBlueprintVm(
        List<WaypointBlueprintVm> waypoints,
        MissionScheduleType defaultScheduleType,
        List<Map<String, Object>> defaultTriggerConditions,
        List<String> requiredCapabilities,
        Double payloadWeightKg,
        Integer estimatedDuration,
        Double estimatedDistance
) {
}

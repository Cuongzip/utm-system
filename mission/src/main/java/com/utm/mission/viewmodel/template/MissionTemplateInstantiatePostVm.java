package com.utm.mission.viewmodel.template;

import com.utm.mission.model.enumeration.MissionScheduleType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;
import java.util.Map;

@Schema(description = "Request payload to instantiate a draft Mission from a Mission Template")
public record MissionTemplateInstantiatePostVm(
        String missionName,
        Map<String, Object> variableValues,
        String departureHubId,
        String arrivalHubId,
        String droneId,
        String pilotId,
        MissionScheduleType scheduleType,
        ZonedDateTime scheduledAt
) {
}

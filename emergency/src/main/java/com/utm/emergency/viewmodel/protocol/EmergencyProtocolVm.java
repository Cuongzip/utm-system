package com.utm.emergency.viewmodel.protocol;

import com.fasterxml.jackson.databind.JsonNode;
import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
import com.utm.emergency.model.enumeration.ResponseAction;

import java.time.ZonedDateTime;

public record EmergencyProtocolVm(
        String id,
        String name,
        String description,
        EmergencyType emergencyType,
        EmergencySeverity severity,
        ResponseAction responseAction,
        ResponseAction fallbackAction,
        boolean requiresConfirmation,
        int confirmationTimeoutSeconds,
        boolean autoExecuteOnTimeout,
        int priority,
        JsonNode thresholds,
        JsonNode conditions,
        boolean notifyPilot,
        boolean notifySupervisor,
        boolean notifyOpsCenter,
        boolean sendSms,
        boolean sendEmail,
        boolean playAudioAlarm,
        boolean isActive,
        boolean isSystemDefault,
        ZonedDateTime createdOn,
        ZonedDateTime lastModifiedOn
) {
}
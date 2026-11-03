package com.utm.emergency.viewmodel.protocol;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
import com.utm.emergency.model.enumeration.ResponseAction;

@JsonIgnoreProperties(ignoreUnknown = true)
public record EmergencyProtocolPutVm(
        String name,
        String description,
        EmergencyType emergencyType,
        EmergencySeverity severity,
        ResponseAction responseAction,
        ResponseAction fallbackAction,
        Boolean requiresConfirmation,
        Integer confirmationTimeoutSeconds,
        Boolean autoExecuteOnTimeout,
        Integer priority,
        JsonNode thresholds,
        JsonNode conditions,
        Boolean notifyPilot,
        Boolean notifySupervisor,
        Boolean notifyOpsCenter,
        Boolean sendSms,
        Boolean sendEmail,
        Boolean playAudioAlarm,
        Boolean isActive
) {
}
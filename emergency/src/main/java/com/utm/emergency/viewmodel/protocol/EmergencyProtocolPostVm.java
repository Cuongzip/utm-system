package com.utm.emergency.viewmodel.protocol;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
import com.utm.emergency.model.enumeration.ResponseAction;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = true)
public record EmergencyProtocolPostVm(
        @NotBlank @Size(max = 100) String name,
        String description,
        @NotNull EmergencyType emergencyType,
        @NotNull EmergencySeverity severity,
        @NotNull ResponseAction responseAction,
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
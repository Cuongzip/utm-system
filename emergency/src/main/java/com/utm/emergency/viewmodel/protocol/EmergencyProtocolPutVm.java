package com.utm.emergency.viewmodel.protocol;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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
        Boolean isActive
) {
}

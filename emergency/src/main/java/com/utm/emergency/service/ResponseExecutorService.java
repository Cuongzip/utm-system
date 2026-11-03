package com.utm.emergency.service;

import com.utm.emergency.model.EmergencyIncident;
import com.utm.emergency.model.enumeration.ResponseAction;

public interface ResponseExecutorService {
    record ValidationResult(boolean safe, String reason, ResponseAction recommendedAction) {}
    ValidationResult validateAction(EmergencyIncident incident, ResponseAction action);
    void executeResponse(EmergencyIncident incident, ResponseAction action, ResponseAction fallbackAction);
}
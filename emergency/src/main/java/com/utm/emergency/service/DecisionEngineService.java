package com.utm.emergency.service;

import com.utm.emergency.model.EmergencyIncident;
import com.utm.emergency.model.EmergencyProtocol;
import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
import com.utm.emergency.model.enumeration.OperationMode;
import com.utm.emergency.viewmodel.incident.EmergencyIncidentVm;
import com.utm.emergency.viewmodel.incident.PendingConfirmationVm;

import java.util.List;

public interface DecisionEngineService {
    OperationMode getMode();
    void setMode(OperationMode mode);
    List<PendingConfirmationVm> getPendingConfirmations();
    EmergencyIncidentVm confirmAction(String incidentId, boolean approved, String userId);
    EmergencyProtocol findMatchingProtocol(EmergencyType type, EmergencySeverity severity);
    void processEmergency(EmergencyIncident incident);
    List<EmergencyIncident> prioritizeEmergencies(List<EmergencyIncident> incidents);
    void reloadProtocols();
}
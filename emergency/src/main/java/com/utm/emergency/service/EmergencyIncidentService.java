package com.utm.emergency.service;

import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
import com.utm.emergency.model.enumeration.IncidentStatus;
import com.utm.emergency.viewmodel.incident.EmergencyIncidentVm;
import com.utm.emergency.viewmodel.incident.IncidentPageVm;
import com.utm.emergency.viewmodel.incident.RootCauseVm;
import com.utm.emergency.viewmodel.stats.EmergencyStatsVm;
import com.utm.emergency.viewmodel.stats.EmergencyTrendVm;

import java.time.ZonedDateTime;
import java.util.List;

public interface EmergencyIncidentService {
    IncidentPageVm searchIncidents(String status, EmergencySeverity severity, EmergencyType type, String droneId, ZonedDateTime from, ZonedDateTime to, int limit, int offset);
    List<EmergencyIncidentVm> getActiveIncidents();
    EmergencyIncidentVm getIncidentById(String id);
    EmergencyIncidentVm updateRootCause(String id, RootCauseVm rootCauseVm);
    EmergencyStatsVm getStats(ZonedDateTime from, ZonedDateTime to);
    List<EmergencyTrendVm> getTrends(ZonedDateTime from, ZonedDateTime to, String interval);
}
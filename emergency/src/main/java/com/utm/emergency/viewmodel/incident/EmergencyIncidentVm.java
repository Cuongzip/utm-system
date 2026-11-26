package com.utm.emergency.viewmodel.incident;

import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
import com.utm.emergency.model.enumeration.IncidentStatus;
import com.utm.emergency.model.enumeration.ResponseAction;
import com.utm.emergency.model.enumeration.RootCause;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

public record EmergencyIncidentVm(
        String id,
        String incidentNumber,
        String droneId,
        String flightId,
        String protocolId,
        EmergencyType emergencyType,
        EmergencySeverity severity,
        IncidentStatus status,
        String message,
        Map<String, Object> detectionData,
        Double latitude,
        Double longitude,
        Double altitude,
        ResponseAction responseAction,
        boolean wasAutoExecuted,
        boolean confirmationRequired,
        String confirmedBy,
        ZonedDateTime confirmedAt,
        ZonedDateTime confirmationTimeoutAt,
        ZonedDateTime actionStartedAt,
        ZonedDateTime actionCompletedAt,
        Boolean actionSuccess,
        String actionError,
        ZonedDateTime resolvedAt,
        String resolvedBy,
        String resolutionNotes,
        RootCause rootCause,
        String rootCauseNotes,
        String lessonsLearned,
        List<IncidentTimelineEventVm> timeline,
        ZonedDateTime detectedAt,
        ZonedDateTime createdOn,
        ZonedDateTime lastModifiedOn
) {
}

package com.utm.emergency.viewmodel.incident;

import com.fasterxml.jackson.databind.JsonNode;
import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
import com.utm.emergency.model.enumeration.IncidentStatus;
import com.utm.emergency.model.enumeration.ResponseAction;
import com.utm.emergency.model.enumeration.RootCause;

import java.time.ZonedDateTime;
import java.util.List;

public record EmergencyIncidentVm(
        String id,
        String incidentNumber,
        String droneId,
        String flightId,
        EmergencyType emergencyType,
        EmergencySeverity severity,
        IncidentStatus status,
        String message,
        JsonNode detectionData,
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
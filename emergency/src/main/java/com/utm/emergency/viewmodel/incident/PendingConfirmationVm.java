package com.utm.emergency.viewmodel.incident;

import com.utm.emergency.viewmodel.protocol.EmergencyProtocolVm;

import java.time.ZonedDateTime;

public record PendingConfirmationVm(
        String incidentId,
        EmergencyIncidentVm incident,
        EmergencyProtocolVm protocol,
        ZonedDateTime timeoutAt
) {
}
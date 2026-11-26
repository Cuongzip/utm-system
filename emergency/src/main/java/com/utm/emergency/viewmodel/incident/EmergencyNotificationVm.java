package com.utm.emergency.viewmodel.incident;

import java.time.ZonedDateTime;

public record EmergencyNotificationVm(
        String incidentId,
        String incidentNumber,
        String droneId,
        String flightId,
        String emergencyType,
        String severity,
        String status,
        String responseAction,
        int priority,
        boolean playAlarm,
        boolean awaitingConfirmation,
        ZonedDateTime confirmationTimeoutAt,
        String deepLink,
        String message,
        ZonedDateTime timestamp
) {
}

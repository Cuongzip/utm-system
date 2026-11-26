package com.utm.conflict.viewmodel.client;

import java.util.Map;

public record EmergencyReportPostVm(
        String droneId,
        String flightId,
        String emergencyType,
        String severity,
        String message,
        Map<String, Object> detectionData,
        Double latitude,
        Double longitude,
        Double altitude
) {
}

package com.utm.emergency.viewmodel.stats;

public record EmergencyTrendVm(
        String period,
        long total,
        long warnings,
        long critical,
        long emergencies
) {
}
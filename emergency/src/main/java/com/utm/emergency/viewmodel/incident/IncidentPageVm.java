package com.utm.emergency.viewmodel.incident;

import java.util.List;

public record IncidentPageVm(
        List<EmergencyIncidentVm> data,
        long total,
        int limit,
        int offset
) {
}
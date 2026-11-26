package com.utm.emergency.viewmodel.incident;

import java.util.Map;

public record IncidentTimelineEventVm(
        String timestamp,
        String event,
        Map<String, Object> data
) {
}

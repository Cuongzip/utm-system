package com.utm.emergency.model;

import java.util.Map;

public record IncidentTimelineEntry(
        String timestamp,
        String event,
        Map<String, Object> data
) {
}

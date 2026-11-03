package com.utm.emergency.viewmodel.incident;

import com.fasterxml.jackson.databind.JsonNode;

public record IncidentTimelineEventVm(
        String timestamp,
        String event,
        JsonNode data
) {
}
package com.utm.emergency.viewmodel.config;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.ZonedDateTime;

public record EmergencyConfigVm(
        String id,
        String key,
        JsonNode value,
        String description,
        ZonedDateTime lastModifiedOn
) {
}
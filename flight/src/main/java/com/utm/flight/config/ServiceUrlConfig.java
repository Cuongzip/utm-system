package com.utm.flight.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "utm.services")
public record ServiceUrlConfig(
        String drone,
        String hub,
        String telemetry
) {
}

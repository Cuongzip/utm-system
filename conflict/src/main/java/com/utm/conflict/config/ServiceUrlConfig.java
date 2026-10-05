package com.utm.conflict.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "utm.services")
public record ServiceUrlConfig(
        String flight,
        String telemetry,
        String drone,
        String hub
) {
}

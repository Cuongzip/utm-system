package com.utm.emergency.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "utm.services")
public record ServiceUrlConfig(
        String flight,
        String drone,
        String hub,
        String alert
) {
}
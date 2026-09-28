package com.utm.backofficebff.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "utm.services")
public record ServiceUrlConfig(
        String drone
) {
}

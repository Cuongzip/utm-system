package com.utm.airspace.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "utm.services")
public record ServiceUrlConfig(String hub) {
}

package com.utm.simulation.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "service")
public record ServiceUrlConfig(
        TelemetryUrlConfig telemetry,
        FlightUrlConfig flight,
        ConnectivityUrlConfig connectivity
) {
    public record TelemetryUrlConfig(String url) {}
    public record FlightUrlConfig(String url) {}
    public record ConnectivityUrlConfig(String url) {}
}


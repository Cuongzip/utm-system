package com.utm.simulation.config;

import com.utm.commonlibrary.utils.ClientUrlUtils;
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

    public String getTelemetryUrl() {
        String configured = telemetry != null ? telemetry.url() : null;
        return ClientUrlUtils.normalizeBaseUrl(configured, "http://telemetry:8089", "telemetry");
    }

    public String getFlightUrl() {
        String configured = flight != null ? flight.url() : null;
        return ClientUrlUtils.normalizeBaseUrl(configured, "http://flight:8086", "flight");
    }

    public String getConnectivityUrl() {
        String configured = connectivity != null ? connectivity.url() : null;
        return ClientUrlUtils.normalizeBaseUrl(configured, "http://connectivity:8094", "connectivity");
    }
}

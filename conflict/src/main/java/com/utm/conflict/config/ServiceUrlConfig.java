package com.utm.conflict.config;

import com.utm.commonlibrary.utils.ClientUrlUtils;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "utm.services")
public record ServiceUrlConfig(
        String flight,
        String telemetry,
        String drone,
        String hub,
        String airspace,
        String alert
) {

    public String getFlightUrl() {
        return ClientUrlUtils.normalizeBaseUrl(flight, "http://flight:8086", "flight");
    }

    public String getTelemetryUrl() {
        return ClientUrlUtils.normalizeBaseUrl(telemetry, "http://telemetry:8089", "telemetry");
    }

    public String getDroneUrl() {
        return ClientUrlUtils.normalizeBaseUrl(drone, "http://drone:8085", "drone");
    }

    public String getHubUrl() {
        return ClientUrlUtils.normalizeBaseUrl(hub, "http://hub:8084", "hub");
    }

    public String getAirspaceUrl() {
        return ClientUrlUtils.normalizeBaseUrl(airspace, "http://airspace:8087", "airspace");
    }

    public String getAlertUrl() {
        return ClientUrlUtils.normalizeBaseUrl(alert, "http://alert:8093", "alert");
    }
}

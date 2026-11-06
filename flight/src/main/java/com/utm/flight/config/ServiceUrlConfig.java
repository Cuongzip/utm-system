package com.utm.flight.config;

import com.utm.commonlibrary.utils.ClientUrlUtils;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "utm.services")
public record ServiceUrlConfig(
        String drone,
        String hub,
        String telemetry,
        String alert,
        String conflict,
        String emergency
) {

    public String getDroneUrl() {
        return ClientUrlUtils.normalizeBaseUrl(drone, "http://drone:8085", "drone");
    }

    public String getHubUrl() {
        return ClientUrlUtils.normalizeBaseUrl(hub, "http://hub:8084", "hub");
    }

    public String getTelemetryUrl() {
        return ClientUrlUtils.normalizeBaseUrl(telemetry, "http://telemetry:8089", "telemetry");
    }

    public String getAlertUrl() {
        return ClientUrlUtils.normalizeBaseUrl(alert, "http://alert:8093", "alert");
    }

    public String getConflictUrl() {
        return ClientUrlUtils.normalizeBaseUrl(conflict, "http://conflict:8092", "conflict");
    }

    public String getEmergencyUrl() {
        return ClientUrlUtils.normalizeBaseUrl(emergency, "http://emergency:8096", "emergency");
    }
}

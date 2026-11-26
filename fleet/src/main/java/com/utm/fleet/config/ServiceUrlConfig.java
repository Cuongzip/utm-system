package com.utm.fleet.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "utm.services")
@Getter
@Setter
public class ServiceUrlConfig {

    private String hub = "http://hub:8084";
    private String drone = "http://drone:8085";
    private String mission = "http://mission:8095";
    private String flight = "http://flight:8086";
    private String telemetry = "http://telemetry:8089";

    public String getHubUrl() {
        return normalize(hub, "/hub");
    }

    public String getDroneUrl() {
        return normalize(drone, "/drone");
    }

    public String getMissionUrl() {
        return normalize(mission, "/mission");
    }

    public String getFlightUrl() {
        return normalize(flight, "/flight");
    }

    public String getTelemetryUrl() {
        return normalize(telemetry, "/telemetry");
    }

    private String normalize(String base, String contextPath) {
        if (base == null || base.isBlank()) {
            return "";
        }
        String trimmed = base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
        return trimmed.endsWith(contextPath) ? trimmed : trimmed + contextPath;
    }
}

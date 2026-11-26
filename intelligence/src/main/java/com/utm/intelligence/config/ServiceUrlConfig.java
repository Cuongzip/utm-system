package com.utm.intelligence.config;

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
    private String flight = "http://flight:8086";
    private String airspace = "http://airspace:8087";
    private String telemetry = "http://telemetry:8089";
    private String conflict = "http://conflict:8092";
    private String emergency = "http://emergency:8096";
    private String weatherAis = "http://weather-ais:8097";
    private String fleet = "http://fleet:8098";

    public String getHubUrl() {
        return normalize(hub, "/hub");
    }

    public String getDroneUrl() {
        return normalize(drone, "/drone");
    }

    public String getFlightUrl() {
        return normalize(flight, "/flight");
    }

    public String getAirspaceUrl() {
        return normalize(airspace, "/airspace");
    }

    public String getTelemetryUrl() {
        return normalize(telemetry, "/telemetry");
    }

    public String getConflictUrl() {
        return normalize(conflict, "/conflict");
    }

    public String getEmergencyUrl() {
        return normalize(emergency, "/emergency");
    }

    public String getWeatherAisUrl() {
        return normalize(weatherAis, "/weather-ais");
    }

    public String getFleetUrl() {
        return normalize(fleet, "/fleet");
    }

    private String normalize(String base, String contextPath) {
        if (base == null || base.isBlank()) {
            return "";
        }
        String trimmed = base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
        return trimmed.endsWith(contextPath) ? trimmed : trimmed + contextPath;
    }
}

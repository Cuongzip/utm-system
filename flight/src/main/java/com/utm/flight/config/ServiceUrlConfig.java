package com.utm.flight.config;

import com.utm.commonlibrary.utils.ClientUrlUtils;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.ConstructorBinding;

@ConfigurationProperties(prefix = "utm.services")
public record ServiceUrlConfig(
        String drone,
        String hub,
        String airspace,
        String telemetry,
        String alert,
        String conflict,
        String emergency,
        String mission,
        String weatherAis
) {
    @ConstructorBinding
    public ServiceUrlConfig {
    }

    public ServiceUrlConfig(
            String drone,
            String hub,
            String airspace,
            String telemetry,
            String alert,
            String conflict,
            String emergency) {
        this(drone, hub, airspace, telemetry, alert, conflict, emergency, "http://mission:8095", "http://weather-ais:8097");
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

    public String getMissionUrl() {
        return ClientUrlUtils.normalizeBaseUrl(mission, "http://mission:8095", "mission");
    }

    public String getWeatherAisUrl() {
        return ClientUrlUtils.normalizeBaseUrl(weatherAis, "http://weather-ais:8097", "weather-ais");
    }
}

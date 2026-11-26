package com.utm.emergency.config;

import com.utm.commonlibrary.utils.ClientUrlUtils;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.ConstructorBinding;

@ConfigurationProperties(prefix = "utm.services")
public record ServiceUrlConfig(
        String flight,
        String drone,
        String hub,
        String alert,
        String telemetry,
        String weatherAis
) {
    @ConstructorBinding
    public ServiceUrlConfig {
    }

    public ServiceUrlConfig(String flight, String drone, String hub, String alert, String telemetry) {
        this(flight, drone, hub, alert, telemetry, null);
    }

    public String getFlightUrl() {
        return ClientUrlUtils.normalizeBaseUrl(flight, "http://flight:8086", "flight");
    }

    public String getDroneUrl() {
        return ClientUrlUtils.normalizeBaseUrl(drone, "http://drone:8085", "drone");
    }

    public String getHubUrl() {
        return ClientUrlUtils.normalizeBaseUrl(hub, "http://hub:8084", "hub");
    }

    public String getAlertUrl() {
        return ClientUrlUtils.normalizeBaseUrl(alert, "http://alert:8093", "alert");
    }

    public String getTelemetryUrl() {
        return ClientUrlUtils.normalizeBaseUrl(telemetry, "http://telemetry:8089", "telemetry");
    }

    public String getWeatherAisUrl() {
        return ClientUrlUtils.normalizeBaseUrl(weatherAis, "http://weather-ais:8097", "weather-ais");
    }
}

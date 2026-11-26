package com.utm.connectivity.config;

import com.utm.commonlibrary.utils.ClientUrlUtils;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.ConstructorBinding;

@ConfigurationProperties(prefix = "utm.services")
public record ServiceUrlConfig(
        String drone,
        String hub,
        String telemetry
) {
    @ConstructorBinding
    public ServiceUrlConfig {
    }

    public ServiceUrlConfig(String drone) {
        this(drone, "http://hub:8084", "http://telemetry:8089");
    }

    public String getDroneUrl() {
        return ClientUrlUtils.normalizeBaseUrl(drone, "http://drone:8085", "drone");
    }

    public String getHubUrl() {
        return ClientUrlUtils.normalizeBaseUrl(hub, "http://hub:8084", "hub");
    }

    public String getTelemetryUrl() {
        return ClientUrlUtils.normalizeBaseUrl(telemetry, "http://telemetry:8089", "telemetry");
    }
}

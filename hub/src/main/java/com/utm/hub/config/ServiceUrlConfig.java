package com.utm.hub.config;

import com.utm.commonlibrary.utils.ClientUrlUtils;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.ConstructorBinding;

@ConfigurationProperties(prefix = "utm.services")
public record ServiceUrlConfig(
        String flight,
        String drone
) {
    @ConstructorBinding
    public ServiceUrlConfig {
    }

    public ServiceUrlConfig(String flight) {
        this(flight, "http://drone:8085");
    }

    public String getFlightUrl() {
        return ClientUrlUtils.normalizeBaseUrl(flight, "http://flight:8086", "flight");
    }

    public String getDroneUrl() {
        return ClientUrlUtils.normalizeBaseUrl(drone, "http://drone:8085", "drone");
    }
}

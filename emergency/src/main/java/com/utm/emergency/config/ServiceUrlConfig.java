package com.utm.emergency.config;

import com.utm.commonlibrary.utils.ClientUrlUtils;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "utm.services")
public record ServiceUrlConfig(
        String flight,
        String drone,
        String hub,
        String alert
) {

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
}

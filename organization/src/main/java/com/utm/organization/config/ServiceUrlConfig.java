package com.utm.organization.config;

import com.utm.commonlibrary.utils.ClientUrlUtils;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "utm.services")
public record ServiceUrlConfig(
        String drone
) {

    public String getDroneUrl() {
        return ClientUrlUtils.normalizeBaseUrl(drone, "http://drone:8085", "drone");
    }
}

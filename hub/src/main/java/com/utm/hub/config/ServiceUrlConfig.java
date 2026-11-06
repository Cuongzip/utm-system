package com.utm.hub.config;

import com.utm.commonlibrary.utils.ClientUrlUtils;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "utm.services")
public record ServiceUrlConfig(
        String flight
) {

    public String getFlightUrl() {
        return ClientUrlUtils.normalizeBaseUrl(flight, "http://flight:8086", "flight");
    }
}

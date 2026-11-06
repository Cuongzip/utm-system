package com.utm.airspace.config;

import com.utm.commonlibrary.utils.ClientUrlUtils;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "utm.services")
public record ServiceUrlConfig(String hub) {

    public String getHubUrl() {
        return ClientUrlUtils.normalizeBaseUrl(hub, "http://hub:8084", "hub");
    }
}

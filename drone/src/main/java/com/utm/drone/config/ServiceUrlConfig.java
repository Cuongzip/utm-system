package com.utm.drone.config;

import com.utm.commonlibrary.utils.ClientUrlUtils;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "utm.services")
public record ServiceUrlConfig(
        String hub,
        String organization,
        String connectivity
) {

    public String getHubUrl() {
        return ClientUrlUtils.normalizeBaseUrl(hub, "http://hub:8084", "hub");
    }

    public String getOrganizationUrl() {
        return ClientUrlUtils.normalizeBaseUrl(organization, "http://organization:8083", "organization");
    }

    public String getConnectivityUrl() {
        return ClientUrlUtils.normalizeBaseUrl(connectivity, "http://connectivity:8088", "connectivity");
    }
}

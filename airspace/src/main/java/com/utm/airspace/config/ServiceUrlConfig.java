package com.utm.airspace.config;

import com.utm.commonlibrary.utils.ClientUrlUtils;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.ConstructorBinding;

@ConfigurationProperties(prefix = "utm.services")
public record ServiceUrlConfig(String hub, String weatherAis) {

    @ConstructorBinding
    public ServiceUrlConfig {
    }

    public ServiceUrlConfig(String hub) {
        this(hub, "http://weather-ais:8097");
    }

    public String getHubUrl() {
        return ClientUrlUtils.normalizeBaseUrl(hub, "http://hub:8084", "hub");
    }

    public String getWeatherAisUrl() {
        return ClientUrlUtils.normalizeBaseUrl(weatherAis, "http://weather-ais:8097", "weather-ais");
    }
}

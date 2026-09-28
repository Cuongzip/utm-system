package com.utm.backofficebff.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "utm.keycloak")
public record KeycloakPropsConfig(
        String authServerUrl,
        String realm,
        String clientId,
        String clientSecret
) {
    public String tokenUrl() {
        return authServerUrl + "/realms/" + realm + "/protocol/openid-connect/token";
    }
}

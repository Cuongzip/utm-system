package com.utm.conflict.config;

import com.utm.conflict.service.SystemTokenService;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(ServiceUrlConfig.class)
public class RestClientConfig {

    @Bean
    public RestClient restClient(SystemTokenService systemTokenService) {
        return RestClient.builder()
                .requestInterceptor((request, body, execution) -> {
                    var authentication = SecurityContextHolder.getContext().getAuthentication();
                    if (authentication instanceof JwtAuthenticationToken jwtAuth) {
                        request.getHeaders().setBearerAuth(jwtAuth.getToken().getTokenValue());
                    } else {
                        String systemToken = systemTokenService.getSystemToken();
                        if (systemToken != null && !systemToken.isBlank()) {
                            request.getHeaders().setBearerAuth(systemToken);
                        }
                    }
                    return execution.execute(request, body);
                })
                .build();
    }
}

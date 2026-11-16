package com.utm.commonlibrary.config;

import com.utm.commonlibrary.service.SystemTokenService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Configuration
public class CommonRestClientConfig {

    @Bean
    @ConditionalOnMissingBean(RestClient.class)
    public RestClient restClient(
            @Autowired(required = false) SystemTokenService systemTokenService,
            @Value("${utm.client.connect-timeout-ms:5000}") int connectTimeoutMs,
            @Value("${utm.client.read-timeout-ms:10000}") int readTimeoutMs
    ) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        factory.setReadTimeout(Duration.ofMillis(readTimeoutMs));

        return RestClient.builder()
                .requestFactory(factory)
                .requestInterceptor((request, body, execution) -> {
                    if (request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION) == null) {
                        var authentication = SecurityContextHolder.getContext().getAuthentication();
                        if (authentication instanceof JwtAuthenticationToken jwtAuth) {
                            request.getHeaders().setBearerAuth(jwtAuth.getToken().getTokenValue());
                        } else if (systemTokenService != null) {
                            String systemToken = systemTokenService.getSystemToken();
                            if (systemToken != null && !systemToken.isBlank()) {
                                request.getHeaders().setBearerAuth(systemToken);
                            }
                        }
                    }
                    return execution.execute(request, body);
                })
                .build();
    }
}

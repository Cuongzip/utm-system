package com.utm.backofficebff.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.client.ClientAuthorizationException;
import org.springframework.security.oauth2.core.OAuth2AuthorizationException;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebExceptionHandler;
import org.springframework.web.server.WebSession;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.nio.charset.StandardCharsets;

@Component
@Order(-2)
public class AuthExceptionHandler implements WebExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(AuthExceptionHandler.class);

    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable ex) {
        if (ex instanceof ClientAuthorizationException || ex instanceof OAuth2AuthorizationException) {
            log.warn("OAuth2 token authorization failed ({}). Invalidating session and challenging with 401/redirect.",
                    ex.getMessage());

            return exchange.getSession()
                    .flatMap(WebSession::invalidate)
                    .then(Mono.defer(() -> {
                        String path = exchange.getRequest().getPath().value();
                        if (path.startsWith("/api/")) {
                            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                            exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
                            byte[] bytes = "{\"error\":\"unauthorized\",\"message\":\"Session or refresh token has expired\"}"
                                    .getBytes(StandardCharsets.UTF_8);
                            DataBuffer buffer = exchange.getResponse().bufferFactory().wrap(bytes);
                            return exchange.getResponse().writeWith(Mono.just(buffer));
                        } else {
                            exchange.getResponse().setStatusCode(HttpStatus.FOUND);
                            exchange.getResponse().getHeaders().setLocation(URI.create("/oauth2/authorization/backoffice-bff"));
                            return exchange.getResponse().setComplete();
                        }
                    }));
        }
        return Mono.error(ex);
    }
}


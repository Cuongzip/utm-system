package com.utm.telemetry.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtDecoder jwtDecoder;
    private final JwtAuthenticationConverter jwtAuthenticationConverter;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String token = extractToken(accessor);
            if (token != null && !token.isBlank()) {
                try {
                    Jwt jwt = jwtDecoder.decode(token);
                    var authentication = jwtAuthenticationConverter.convert(jwt);
                    accessor.setUser(authentication);
                    log.debug("WebSocket STOMP connection authenticated for user: {}",
                            authentication != null ? authentication.getName() : "unknown");
                } catch (Exception ex) {
                    log.warn("Invalid JWT token during WebSocket STOMP CONNECT: {}", ex.getMessage());
                }
            }
        }
        return message;
    }

    private String extractToken(StompHeaderAccessor accessor) {
        List<String> authHeaders = accessor.getNativeHeader("Authorization");
        if (authHeaders != null && !authHeaders.isEmpty()) {
            String header = authHeaders.get(0);
            if (header.startsWith("Bearer ")) {
                return header.substring(7);
            }
            return header;
        }

        List<String> tokenHeaders = accessor.getNativeHeader("token");
        if (tokenHeaders != null && !tokenHeaders.isEmpty()) {
            return tokenHeaders.get(0);
        }

        List<String> accessTokenHeaders = accessor.getNativeHeader("access_token");
        if (accessTokenHeaders != null && !accessTokenHeaders.isEmpty()) {
            return accessTokenHeaders.get(0);
        }

        String passcode = accessor.getPasscode();
        if (passcode != null && !passcode.isBlank()) {
            return passcode;
        }

        return null;
    }
}

package com.utm.backofficebff.config;

import java.net.URI;
import java.util.Collection;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.authority.mapping.GrantedAuthoritiesMapper;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ReactiveClientRegistrationRepository;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUserAuthority;
import org.springframework.security.oauth2.core.user.OAuth2UserAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoderFactory;
import org.springframework.security.web.server.DelegatingServerAuthenticationEntryPoint;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.security.web.server.ServerAuthenticationEntryPoint;
import org.springframework.security.web.server.authentication.HttpStatusServerEntryPoint;
import org.springframework.security.web.server.authentication.RedirectServerAuthenticationEntryPoint;
import org.springframework.security.web.server.authentication.ServerAuthenticationFailureHandler;
import org.springframework.security.web.server.authentication.logout.ServerLogoutSuccessHandler;
import org.springframework.security.web.server.util.matcher.MediaTypeServerWebExchangeMatcher;
import org.springframework.security.web.server.util.matcher.ServerWebExchangeMatchers;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.session.CookieWebSessionIdResolver;
import org.springframework.web.server.session.WebSessionIdResolver;
import reactor.core.publisher.Mono;

@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {
    private static final String REALM_ACCESS_CLAIM = "realm_access";
    private static final String ROLES_CLAIM = "roles";
    private static final String DEFAULT_REGISTRATION_ID = "backoffice-bff";

    @Value("${keycloak.logout-url:}")
    private String configuredLogoutUrl;

    private final ReactiveClientRegistrationRepository clientRegistrationRepository;

    public SecurityConfig(ReactiveClientRegistrationRepository clientRegistrationRepository) {
        this.clientRegistrationRepository = clientRegistrationRepository;
    }

    @Bean
    public SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {
        return http
                .authorizeExchange(auth -> auth
                        .pathMatchers("/actuator/**", "/error").permitAll()
                        .anyExchange().authenticated())
                .oauth2Login(oauth2 -> oauth2
                        .authenticationFailureHandler(authenticationFailureHandler()))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(delegatingAuthenticationEntryPoint()))
                .httpBasic(ServerHttpSecurity.HttpBasicSpec::disable)
                .formLogin(ServerHttpSecurity.FormLoginSpec::disable)
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .logout(logout -> logout
                        .requiresLogout(ServerWebExchangeMatchers.pathMatchers("/logout"))
                        .logoutSuccessHandler(oidcLogoutSuccessHandler()))
                .build();
    }

    private ServerAuthenticationEntryPoint delegatingAuthenticationEntryPoint() {
        DelegatingServerAuthenticationEntryPoint.DelegateEntry htmlEntry = new DelegatingServerAuthenticationEntryPoint.DelegateEntry(
                new MediaTypeServerWebExchangeMatcher(MediaType.TEXT_HTML),
                new RedirectServerAuthenticationEntryPoint("/oauth2/authorization/backoffice-bff"));
        DelegatingServerAuthenticationEntryPoint entryPoint = new DelegatingServerAuthenticationEntryPoint(htmlEntry);
        entryPoint.setDefaultEntryPoint(new HttpStatusServerEntryPoint(HttpStatus.UNAUTHORIZED));
        return entryPoint;
    }

    private ServerAuthenticationFailureHandler authenticationFailureHandler() {
        return (webFilterExchange, exception) -> {
            ServerWebExchange exchange = webFilterExchange.getExchange();
            return exchange.getPrincipal()
                    .flatMap(principal -> {
                        ServerHttpResponse response = exchange.getResponse();
                        response.setStatusCode(HttpStatus.FOUND);
                        response.getHeaders().setLocation(URI.create("/dashboard"));
                        return response.setComplete();
                    })
                    .switchIfEmpty(Mono.defer(() -> {
                        ServerHttpResponse response = exchange.getResponse();
                        response.setStatusCode(HttpStatus.FOUND);
                        response.getHeaders().setLocation(URI.create("/oauth2/authorization/backoffice-bff"));
                        return response.setComplete();
                    }));
        };
    }

    @Bean
    public WebSessionIdResolver webSessionIdResolver() {
        CookieWebSessionIdResolver resolver = new CookieWebSessionIdResolver();
        resolver.setCookieName("SESSION");
        resolver.addCookieInitializer(builder -> builder.sameSite("Lax").path("/"));
        return resolver;
    }

    @Bean
    public ReactiveJwtDecoderFactory<ClientRegistration> jwtDecoderFactory() {
        return clientRegistration -> {
            String jwkSetUri = clientRegistration.getProviderDetails().getJwkSetUri();
            NimbusReactiveJwtDecoder jwtDecoder = NimbusReactiveJwtDecoder.withJwkSetUri(jwkSetUri).build();
            OAuth2TokenValidator<Jwt> withTimestamp = new JwtTimestampValidator();
            OAuth2TokenValidator<Jwt> withIssuer = jwt -> {
                String iss = jwt.getIssuer() != null ? jwt.getIssuer().toString() : "";
                String realmFragment = "/realms/";
                if (jwkSetUri != null && jwkSetUri.contains("/realms/")) {
                    int start = jwkSetUri.indexOf("/realms/");
                    int end = jwkSetUri.indexOf("/", start + "/realms/".length());
                    realmFragment = end != -1 ? jwkSetUri.substring(start, end) : jwkSetUri.substring(start);
                }
                if (iss.contains(realmFragment)) {
                    return OAuth2TokenValidatorResult.success();
                }
                return OAuth2TokenValidatorResult.failure(
                        new OAuth2Error("invalid_token", "Invalid issuer: " + iss, null));
            };
            jwtDecoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(withTimestamp, withIssuer));
            return jwtDecoder;
        };
    }

    private ServerLogoutSuccessHandler oidcLogoutSuccessHandler() {
        return (webFilterExchange, authentication) -> {
            ServerWebExchange exchange = webFilterExchange.getExchange();
            var req = exchange.getRequest();
            String host = req.getHeaders().getFirst("X-Forwarded-Host");
            if (host == null || host.isBlank())
                host = req.getHeaders().getFirst("Host");
            if (host == null || host.isBlank())
                host = req.getURI().getAuthority();

            String scheme = req.getHeaders().getFirst("X-Forwarded-Proto");
            if (scheme == null || scheme.isBlank())
                scheme = req.getURI().getScheme();

            String postLogoutUri = (scheme != null ? scheme : "http") + "://" + host + "/";
            String idTokenHint = "";
            if (authentication != null && authentication.getPrincipal() instanceof OidcUser oidcUser) {
                if (oidcUser.getIdToken() != null && oidcUser.getIdToken().getTokenValue() != null) {
                    idTokenHint = "&id_token_hint=" + oidcUser.getIdToken().getTokenValue();
                }
            }

            final String finalIdTokenHint = idTokenHint;
            final String finalPostLogoutUri = postLogoutUri;

            return clientRegistrationRepository.findByRegistrationId(DEFAULT_REGISTRATION_ID)
                    .map(clientRegistration -> {
                        String logoutEndpoint = configuredLogoutUrl;
                        String clientId = clientRegistration.getClientId();
                        if (logoutEndpoint == null || logoutEndpoint.isBlank()) {
                            String authUri = clientRegistration.getProviderDetails().getAuthorizationUri();
                            if (authUri != null && authUri.contains("/protocol/openid-connect/auth")) {
                                logoutEndpoint = authUri.replace("/protocol/openid-connect/auth",
                                        "/protocol/openid-connect/logout");
                            }
                        }
                        return buildLogoutUrl(logoutEndpoint, clientId, finalPostLogoutUri, finalIdTokenHint);
                    })
                    .defaultIfEmpty(buildLogoutUrl(configuredLogoutUrl, DEFAULT_REGISTRATION_ID, finalPostLogoutUri,
                            finalIdTokenHint))
                    .flatMap(redirectUrl -> {
                        exchange.getResponse().setStatusCode(HttpStatus.FOUND);
                        exchange.getResponse().getHeaders().setLocation(URI.create(redirectUrl));
                        return exchange.getResponse().setComplete();
                    });
        };
    }

    private String buildLogoutUrl(String baseLogoutUrl, String clientId, String postLogoutUri, String idTokenHint) {
        String url = (baseLogoutUrl != null && !baseLogoutUrl.isBlank())
                ? baseLogoutUrl
                : "http://localhost:8080/realms/UTM/protocol/openid-connect/logout";
        return url + "?client_id=" + clientId + "&post_logout_redirect_uri=" + postLogoutUri + idTokenHint;
    }

    @Bean
    public GrantedAuthoritiesMapper userAuthoritiesMapperForKeycloak() {
        return authorities -> {
            Set<GrantedAuthority> mappedAuthorities = new HashSet<>();
            if (authorities.isEmpty()) {
                return mappedAuthorities;
            }

            var authority = authorities.iterator().next();
            if (authority instanceof OidcUserAuthority oidcUserAuthority) {
                var userInfo = oidcUserAuthority.getUserInfo();
                if (userInfo != null && userInfo.hasClaim(REALM_ACCESS_CLAIM)) {
                    mappedAuthorities.addAll(extractAuthorities(userInfo.getClaimAsMap(REALM_ACCESS_CLAIM)));
                }
            } else if (authority instanceof OAuth2UserAuthority oauth2UserAuthority) {
                Map<String, Object> userAttributes = oauth2UserAuthority.getAttributes();
                if (userAttributes != null && userAttributes.containsKey(REALM_ACCESS_CLAIM)) {
                    mappedAuthorities.addAll(extractAuthorities(userAttributes.get(REALM_ACCESS_CLAIM)));
                }
            }

            return mappedAuthorities;
        };
    }

    private Collection<GrantedAuthority> extractAuthorities(Object realmAccessObj) {
        if (realmAccessObj instanceof Map<?, ?> realmAccess) {
            Object rolesObj = realmAccess.get(ROLES_CLAIM);
            if (rolesObj instanceof Collection<?> roleList) {
                return roleList.stream()
                        .filter(String.class::isInstance)
                        .map(String.class::cast)
                        .map(role -> (GrantedAuthority) new SimpleGrantedAuthority("ROLE_" + role))
                        .collect(Collectors.toList());
            }
        }
        return java.util.Collections.emptyList();
    }
}

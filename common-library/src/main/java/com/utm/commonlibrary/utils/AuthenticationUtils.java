package com.utm.commonlibrary.utils;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.AccessDeniedException;
import java.util.Collections;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

public final class AuthenticationUtils {

    private AuthenticationUtils() {
    }

    public static String extractUserId() {
        Authentication authentication = getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new AccessDeniedException(MessageCode.ACCESS_DENIED);
        }

        if (authentication.getPrincipal() instanceof Jwt jwt) {
            String subject = jwt.getSubject();
            if (subject != null && !subject.isBlank()) {
                return subject;
            }
        }

        String name = authentication.getName();
        if (name != null && !name.isBlank() && !"anonymousUser".equals(name)) {
            return name;
        }

        throw new AccessDeniedException(MessageCode.ACCESS_DENIED);
    }

    public static Optional<String> extractOrgId() {
        Authentication authentication = getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            String orgId = jwt.getClaimAsString("orgId");
            if (orgId == null || orgId.isBlank()) {
                orgId = jwt.getClaimAsString("organizationId");
            }
            if (orgId != null && !orgId.isBlank()) {
                return Optional.of(orgId.trim());
            }
        }
        return Optional.empty();
    }

    public static Set<String> extractRoles() {
        Authentication authentication = getAuthentication();
        if (authentication == null || authentication.getAuthorities() == null) {
            return Collections.emptySet();
        }
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(auth -> auth != null && !auth.isBlank())
                .map(auth -> auth.startsWith("ROLE_") ? auth.substring(5) : auth)
                .collect(Collectors.toUnmodifiableSet());
    }

    public static boolean hasRole(String role) {
        if (role == null || role.isBlank()) {
            return false;
        }
        return extractRoles().stream().anyMatch(r -> r.equalsIgnoreCase(role.trim()));
    }

    public static Authentication getAuthentication() {
        return SecurityContextHolder.getContext().getAuthentication();
    }
}

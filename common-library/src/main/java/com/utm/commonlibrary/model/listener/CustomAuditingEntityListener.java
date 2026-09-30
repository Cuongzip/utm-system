package com.utm.commonlibrary.model.listener;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import java.util.Optional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

public class CustomAuditingEntityListener {

    @PrePersist
    public void touchForCreate(Object target) {
        if (target instanceof AbstractAuditEntity entity) {
            String currentUserId = getCurrentUserId();
            if (entity.getCreatedBy() == null) {
                entity.setCreatedBy(currentUserId);
            }
            if (entity.getLastModifiedBy() == null) {
                entity.setLastModifiedBy(currentUserId);
            }
        }
    }

    @PreUpdate
    public void touchForUpdate(Object target) {
        if (target instanceof AbstractAuditEntity entity) {
            entity.setLastModifiedBy(getCurrentUserId());
        }
    }

    private String getCurrentUserId() {
        return resolveUserId().orElse("system");
    }

    private Optional<String> resolveUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return Optional.empty();
        }


        if (authentication instanceof JwtAuthenticationToken jwtAuth) {
            String userId = jwtAuth.getToken().getSubject();
            if (userId != null && !userId.isBlank()) {
                return Optional.of(userId);
            }
            return Optional.ofNullable(jwtAuth.getName());
        }


        if (authentication.getPrincipal() instanceof Jwt jwt) {
            String userId = jwt.getSubject();
            if (userId != null && !userId.isBlank()) {
                return Optional.of(userId);
            }
            return Optional.ofNullable(jwt.getClaimAsString("sub"));
        }


        String name = authentication.getName();
        if (name != null && !name.isBlank() && !"anonymousUser".equals(name)) {
            return Optional.of(name);
        }

        return Optional.empty();
    }
}

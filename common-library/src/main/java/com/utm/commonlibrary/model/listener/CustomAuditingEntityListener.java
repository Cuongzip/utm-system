package com.utm.commonlibrary.model.listener;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import java.util.Optional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

public class CustomAuditingEntityListener {

    private static final int MAX_AUDIT_USER_LENGTH = 100;

    @PrePersist
    public void touchForCreate(Object target) {
        if (target instanceof AbstractAuditEntity entity) {
            String currentUserId = getCurrentUserId();
            if (entity.getCreatedBy() == null || entity.getCreatedBy().isBlank()) {
                entity.setCreatedBy(currentUserId);
            } else {
                entity.setCreatedBy(truncateActor(entity.getCreatedBy()));
            }
            if (entity.getLastModifiedBy() == null || entity.getLastModifiedBy().isBlank()) {
                entity.setLastModifiedBy(currentUserId);
            } else {
                entity.setLastModifiedBy(truncateActor(entity.getLastModifiedBy()));
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
        return truncateActor(resolveUserId().orElse("system"));
    }

    private String truncateActor(String actor) {
        String trimmed = actor.trim();
        return trimmed.length() > MAX_AUDIT_USER_LENGTH
                ? trimmed.substring(0, MAX_AUDIT_USER_LENGTH)
                : trimmed;
    }

    private Optional<String> resolveUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return Optional.empty();
        }

        if (authentication.getPrincipal() instanceof Jwt jwt) {
            String userId = jwt.getSubject();
            if (userId != null && !userId.isBlank()) {
                return Optional.of(userId);
            }
        }

        String name = authentication.getName();
        if (name != null && !name.isBlank() && !"anonymousUser".equals(name)) {
            return Optional.of(name);
        }

        return Optional.empty();
    }
}

package com.utm.connectivity.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.ZonedDateTime;
import java.util.List;

@Entity
@Table(name = "manufacturer_api_keys")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManufacturerApiKey extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "name", length = 255, nullable = false)
    private String name;

    @Column(name = "manufacturer_name", length = 255, nullable = false)
    private String manufacturerName;

    @Column(name = "key_prefix", length = 20, nullable = false)
    private String keyPrefix;

    @Column(name = "key_hash", length = 128, nullable = false, unique = true)
    private String keyHash;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "scopes", columnDefinition = "jsonb", nullable = false)
    private List<String> scopes;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "expires_at")
    private ZonedDateTime expiresAt;

    @Column(name = "last_used_at")
    private ZonedDateTime lastUsedAt;

    @Column(name = "revoked_at")
    private ZonedDateTime revokedAt;
}

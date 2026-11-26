package com.utm.hub.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.hub.model.enumeration.HubStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

import java.util.Map;

@Entity
@Table(name = "hub")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Hub extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "code", length = 50, nullable = false, unique = true)
    private String code;

    @Column(name = "name", length = 255, nullable = false)
    private String name;

    @Column(name = "organization_id", length = 36)
    private String organizationId;

    @Embedded
    private Location location;

    @Column(name = "altitude_msl", nullable = false)
    @Builder.Default
    private Double altitudeMsl = 0.0;

    @Column(name = "airspace_radius", nullable = false)
    @Builder.Default
    private Double airspaceRadius = 1000.0;

    @Column(name = "max_simultaneous_drones", nullable = false)
    @Builder.Default
    private Integer maxSimultaneousDrones = 10;

    @Column(name = "airspace_floor", nullable = false)
    @Builder.Default
    private Double airspaceFloor = 0.0;

    @Column(name = "airspace_ceiling", nullable = false)
    @Builder.Default
    private Double airspaceCeiling = 120.0;

    @Column(name = "timezone", length = 50, nullable = false)
    @Builder.Default
    private String timezone = "Asia/Ho_Chi_Minh";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "capabilities", columnDefinition = "jsonb")
    private Map<String, Object> capabilities;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "contact_info", columnDefinition = "jsonb")
    private Map<String, Object> contactInfo;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50, nullable = false)
    @Builder.Default
    private HubStatus status = HubStatus.ACTIVE;
}

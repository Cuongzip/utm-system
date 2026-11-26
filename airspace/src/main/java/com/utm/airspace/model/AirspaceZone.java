package com.utm.airspace.model;

import com.utm.airspace.model.enumeration.AirspaceZoneStatus;
import com.utm.airspace.model.enumeration.AirspaceZoneType;
import com.utm.commonlibrary.model.AbstractAuditEntity;
import jakarta.persistence.Column;
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

import java.time.ZonedDateTime;
import java.util.Map;

@Entity
@Table(name = "airspace_zone")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AirspaceZone extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "code", length = 50, nullable = false, unique = true)
    private String code;

    @Column(name = "hub_id", length = 36)
    private String hubId;

    @Column(name = "name", length = 255, nullable = false, unique = true)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "zone_type", length = 50, nullable = false)
    private AirspaceZoneType zoneType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "geometry", columnDefinition = "jsonb", nullable = false)
    private GeoJsonPolygon geometry;

    @Column(name = "altitude_floor", nullable = false)
    @Builder.Default
    private Double altitudeFloor = 0.0;

    @Column(name = "altitude_ceiling", nullable = false)
    @Builder.Default
    private Double altitudeCeiling = 120.0;

    @Column(name = "effective_start")
    private ZonedDateTime effectiveStart;

    @Column(name = "effective_end")
    private ZonedDateTime effectiveEnd;

    @Column(name = "priority", nullable = false)
    @Builder.Default
    private Integer priority = 0;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "rules", columnDefinition = "jsonb")
    private Map<String, Object> rules;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "schedule", columnDefinition = "jsonb")
    private Map<String, Object> schedule;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50, nullable = false)
    @Builder.Default
    private AirspaceZoneStatus status = AirspaceZoneStatus.ACTIVE;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
}

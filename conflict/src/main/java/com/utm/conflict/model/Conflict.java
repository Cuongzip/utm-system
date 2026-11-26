package com.utm.conflict.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.conflict.model.enumeration.ConflictSeverity;
import com.utm.conflict.model.enumeration.ConflictStatus;
import com.utm.conflict.model.enumeration.ConflictType;
import com.utm.conflict.model.enumeration.ResolutionStrategy;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
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
@Table(name = "conflict")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Conflict extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(name = "conflict_type", length = 50, nullable = false)
    @Builder.Default
    private ConflictType conflictType = ConflictType.SEPARATION_MINIMUM;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", length = 20, nullable = false)
    @Builder.Default
    private ConflictSeverity severity = ConflictSeverity.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50, nullable = false)
    @Builder.Default
    private ConflictStatus status = ConflictStatus.DETECTED;

    @Column(name = "primary_flight_id", length = 36, nullable = false)
    private String primaryFlightId;

    @Column(name = "secondary_flight_id", length = 36)
    private String secondaryFlightId;

    @Column(name = "hub_id", length = 36)
    private String hubId;

    @Column(name = "airspace_zone_id", length = 36)
    private String airspaceZoneId;

    @Column(name = "detected_at", nullable = false)
    private ZonedDateTime detectedAt;

    @Column(name = "detection_method", length = 50)
    private String detectionMethod;

    @Column(name = "location_lat")
    private Double locationLat;

    @Column(name = "location_lon")
    private Double locationLon;

    @Column(name = "altitude")
    private Double altitude;

    @Column(name = "separation_distance")
    private Double separationDistance;

    @Column(name = "min_separation_distance")
    private Double minSeparationDistance;

    @Column(name = "vertical_separation")
    private Double verticalSeparation;

    @Enumerated(EnumType.STRING)
    @Column(name = "max_severity", length = 20)
    private ConflictSeverity maxSeverity;

    @Column(name = "time_to_conflict_sec")
    private Integer timeToConflictSec;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "data", columnDefinition = "jsonb")
    private Map<String, Object> data;

    @Enumerated(EnumType.STRING)
    @Column(name = "resolution_strategy", length = 50)
    private ResolutionStrategy resolutionStrategy;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "resolution_actions", columnDefinition = "jsonb")
    private Map<String, Object> resolutionActions;

    @Column(name = "resolved_at")
    private ZonedDateTime resolvedAt;

    @Column(name = "resolved_by", length = 100)
    private String resolvedBy;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;
}

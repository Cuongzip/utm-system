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
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.ZonedDateTime;

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

    @Column(name = "vertical_separation")
    private Double verticalSeparation;

    @Column(name = "time_to_conflict_sec")
    private Integer timeToConflictSec;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "resolution_strategy", length = 50)
    private ResolutionStrategy resolutionStrategy;

    @Column(name = "resolution_actions", columnDefinition = "TEXT")
    private String resolutionActions;

    @Column(name = "resolved_at")
    private ZonedDateTime resolvedAt;

    @Column(name = "resolved_by", length = 100)
    private String resolvedBy;
}

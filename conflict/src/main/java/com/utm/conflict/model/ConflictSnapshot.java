package com.utm.conflict.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.conflict.model.enumeration.ConflictSeverity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.ZonedDateTime;

@Entity
@Table(name = "conflict_snapshot")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConflictSnapshot extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conflict_id", nullable = false)
    private Conflict conflict;

    @Column(name = "recorded_at", nullable = false)
    private ZonedDateTime recordedAt;

    @Column(name = "primary_lat")
    private Double primaryLat;

    @Column(name = "primary_lon")
    private Double primaryLon;

    @Column(name = "primary_alt")
    private Double primaryAlt;

    @Column(name = "secondary_lat")
    private Double secondaryLat;

    @Column(name = "secondary_lon")
    private Double secondaryLon;

    @Column(name = "secondary_alt")
    private Double secondaryAlt;

    @Column(name = "separation_distance")
    private Double separationDistance;

    @Column(name = "vertical_separation")
    private Double verticalSeparation;

    @Column(name = "time_to_conflict_sec")
    private Integer timeToConflictSec;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", length = 20)
    private ConflictSeverity severity;
}

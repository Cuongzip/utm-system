package com.utm.fleet.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.fleet.model.enumeration.AssignedByType;
import com.utm.fleet.model.enumeration.AssignmentStatus;
import com.utm.fleet.viewmodel.FleetDtos.AlternativeDroneVm;
import com.utm.fleet.viewmodel.FleetDtos.DroneScoreVm;
import com.utm.fleet.viewmodel.FleetDtos.ScoringWeightsVm;
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
import java.util.List;

@Entity
@Table(name = "fleet_assignment")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FleetAssignment extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "mission_id", length = 36, nullable = false)
    private String missionId;

    @Column(name = "drone_id", length = 36)
    private String droneId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "scores", columnDefinition = "jsonb", nullable = false)
    private DroneScoreVm scores;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "weights", columnDefinition = "jsonb", nullable = false)
    private ScoringWeightsVm weights;

    @Column(name = "final_score", nullable = false)
    @Builder.Default
    private Double finalScore = 0.0;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30, nullable = false)
    @Builder.Default
    private AssignmentStatus status = AssignmentStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "assigned_by", length = 30, nullable = false)
    @Builder.Default
    private AssignedByType assignedBy = AssignedByType.SYSTEM;

    @Column(name = "operator_id", length = 100)
    private String operatorId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "alternative_drones", columnDefinition = "jsonb")
    private List<AlternativeDroneVm> alternativeDrones;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "assigned_at")
    private ZonedDateTime assignedAt;

    @Column(name = "completed_at")
    private ZonedDateTime completedAt;
}

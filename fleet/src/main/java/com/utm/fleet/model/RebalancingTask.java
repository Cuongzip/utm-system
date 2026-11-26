package com.utm.fleet.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.fleet.model.enumeration.RebalancingStatus;
import com.utm.fleet.model.enumeration.RebalancingTrigger;
import com.utm.fleet.viewmodel.FleetDtos.RebalancingRuleVm;
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

@Entity
@Table(name = "rebalancing_task")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RebalancingTask extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "source_hub_id", length = 36, nullable = false)
    private String sourceHubId;

    @Column(name = "target_hub_id", length = 36, nullable = false)
    private String targetHubId;

    @Column(name = "drone_id", length = 36, nullable = false)
    private String droneId;

    @Column(name = "repositioning_mission_id", length = 36)
    private String repositioningMissionId;

    @Column(name = "repositioning_flight_id", length = 36)
    private String repositioningFlightId;

    @Enumerated(EnumType.STRING)
    @Column(name = "trigger_type", length = 40, nullable = false)
    @Builder.Default
    private RebalancingTrigger trigger = RebalancingTrigger.THRESHOLD_BREACH;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "rule", columnDefinition = "jsonb", nullable = false)
    private RebalancingRuleVm rule;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30, nullable = false)
    @Builder.Default
    private RebalancingStatus status = RebalancingStatus.PENDING;

    @Column(name = "priority", nullable = false)
    @Builder.Default
    private Integer priority = 1;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private ZonedDateTime approvedAt;

    @Column(name = "started_at")
    private ZonedDateTime startedAt;

    @Column(name = "completed_at")
    private ZonedDateTime completedAt;

    @Column(name = "cancelled_reason", columnDefinition = "TEXT")
    private String cancelledReason;

    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;
}

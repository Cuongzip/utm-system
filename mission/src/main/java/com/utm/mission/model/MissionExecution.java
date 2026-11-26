package com.utm.mission.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.mission.model.enumeration.ExecutionMode;
import com.utm.mission.model.enumeration.ExecutionStatus;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "mission_execution")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MissionExecution extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "mission_id", length = 36, nullable = false)
    private String missionId;

    @Column(name = "pilot_id", length = 100)
    private String pilotId;

    @Column(name = "started_at", nullable = false)
    private ZonedDateTime startedAt;

    @Column(name = "completed_at")
    private ZonedDateTime completedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "execution_mode", length = 30, nullable = false)
    @Builder.Default
    private ExecutionMode executionMode = ExecutionMode.SAME_DRONE_SEQUENTIAL;

    @Column(name = "primary_drone_id", length = 36)
    private String primaryDroneId;

    @Column(name = "current_leg_index", nullable = false)
    @Builder.Default
    private Integer currentLegIndex = 0;

    @Column(name = "total_legs", nullable = false)
    @Builder.Default
    private Integer totalLegs = 1;

    @Column(name = "completed_legs", nullable = false)
    @Builder.Default
    private Integer completedLegs = 0;

    @Column(name = "current_waypoint_index", nullable = false)
    @Builder.Default
    private Integer currentWaypointIndex = 0;

    @Column(name = "completed_waypoints", nullable = false)
    @Builder.Default
    private Integer completedWaypoints = 0;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "waypoint_logs", columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private List<Map<String, Object>> waypointLogs = new ArrayList<>();

    @Column(name = "paused_at")
    private ZonedDateTime pausedAt;

    @Column(name = "abort_reason", columnDefinition = "TEXT")
    private String abortReason;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "trigger_type", length = 30, nullable = false)
    @Builder.Default
    private String triggerType = "MANUAL";

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50, nullable = false)
    @Builder.Default
    private ExecutionStatus status = ExecutionStatus.IN_PROGRESS;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;
}

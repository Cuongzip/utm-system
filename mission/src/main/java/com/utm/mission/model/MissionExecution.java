package com.utm.mission.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.mission.model.enumeration.ExecutionStatus;
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

    @Column(name = "current_waypoint_index", nullable = false)
    @Builder.Default
    private Integer currentWaypointIndex = 0;

    @Column(name = "total_waypoints", nullable = false)
    private Integer totalWaypoints;

    @Column(name = "completed_waypoints", nullable = false)
    @Builder.Default
    private Integer completedWaypoints = 0;

    @Column(name = "started_at", nullable = false)
    private ZonedDateTime startedAt;

    @Column(name = "completed_at")
    private ZonedDateTime completedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50, nullable = false)
    @Builder.Default
    private ExecutionStatus status = ExecutionStatus.IN_PROGRESS;
}

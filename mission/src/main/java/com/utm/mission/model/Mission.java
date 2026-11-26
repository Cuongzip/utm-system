package com.utm.mission.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.mission.model.enumeration.MissionScheduleType;
import com.utm.mission.model.enumeration.MissionStatus;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
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
@Table(name = "mission")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Mission extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "code", length = 50, nullable = false, unique = true)
    private String code;

    @Column(name = "name", length = 255, nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "payload_weight_kg", nullable = false)
    @Builder.Default
    private Double payloadWeightKg = 0.0;

    @Column(name = "departure_hub_id", length = 36, nullable = false)
    private String departureHubId;

    @Column(name = "arrival_hub_id", length = 36, nullable = false)
    private String arrivalHubId;

    @Column(name = "drone_id", length = 36)
    private String droneId;

    @Column(name = "pilot_id", length = 100)
    private String pilotId;

    @Enumerated(EnumType.STRING)
    @Column(name = "schedule_type", length = 50, nullable = false)
    @Builder.Default
    private MissionScheduleType scheduleType = MissionScheduleType.IMMEDIATE;

    @Column(name = "scheduled_at")
    private ZonedDateTime scheduledAt;

    @Column(name = "recurring_pattern", length = 100)
    private String recurringPattern;

    @Column(name = "dispatch_grace_minutes", nullable = false)
    @Builder.Default
    private Integer dispatchGraceMinutes = 30;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "trigger_conditions", columnDefinition = "jsonb")
    private List<Map<String, Object>> triggerConditions;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "required_capabilities", columnDefinition = "jsonb")
    private List<String> requiredCapabilities;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "feasibility_override", columnDefinition = "jsonb")
    private Map<String, Object> feasibilityOverride;

    @Column(name = "template_id", length = 36)
    private String templateId;

    @Column(name = "template_version")
    private Integer templateVersion;

    @Column(name = "estimated_distance")
    private Double estimatedDistance;

    @Column(name = "estimated_duration")
    private Integer estimatedDuration;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50, nullable = false)
    @Builder.Default
    private MissionStatus status = MissionStatus.DRAFT;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;

    @OneToMany(mappedBy = "mission", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("sequence ASC")
    @Builder.Default
    private List<Waypoint> waypoints = new ArrayList<>();

    public void addWaypoint(Waypoint waypoint) {
        if (waypoint != null) {
            if (this.waypoints == null) {
                this.waypoints = new ArrayList<>();
            }
            this.waypoints.add(waypoint);
            waypoint.setMission(this);
        }
    }

    public void removeWaypoint(Waypoint waypoint) {
        if (waypoint != null && this.waypoints != null) {
            this.waypoints.remove(waypoint);
            waypoint.setMission(null);
        }
    }
}

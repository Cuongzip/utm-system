package com.utm.mission.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.mission.model.enumeration.StopoverType;
import com.utm.mission.model.enumeration.WaypointType;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;

@Entity
@Table(name = "waypoint")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Waypoint extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mission_id", nullable = false)
    private Mission mission;

    @Column(name = "sequence", nullable = false)
    private Integer sequence;

    @Column(name = "name", length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "waypoint_type", length = 20, nullable = false)
    @Builder.Default
    private WaypointType waypointType = WaypointType.COORDINATE;

    @Column(name = "latitude", nullable = false)
    private Double latitude;

    @Column(name = "longitude", nullable = false)
    private Double longitude;

    @Column(name = "altitude", nullable = false)
    private Double altitude;

    @Column(name = "speed_to_waypoint")
    private Double speedToWaypoint;

    @Column(name = "heading_at_waypoint")
    private Double headingAtWaypoint;

    @Column(name = "turn_radius")
    private Double turnRadius;

    @Column(name = "wait_for_confirmation", nullable = false)
    @Builder.Default
    private Boolean waitForConfirmation = false;

    @Column(name = "hub_id", length = 36)
    private String hubId;

    @Enumerated(EnumType.STRING)
    @Column(name = "stopover_type", length = 30, nullable = false)
    @Builder.Default
    private StopoverType stopoverType = StopoverType.NONE;

    @Column(name = "ground_time_minutes")
    private Integer groundTimeMinutes;

    @Column(name = "payload_delta_kg", nullable = false)
    @Builder.Default
    private Double payloadDeltaKg = 0.0;

    @Column(name = "hover_duration_sec", nullable = false)
    @Builder.Default
    private Integer hoverDurationSec = 0;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "actions", columnDefinition = "jsonb")
    private Map<String, Object> actions;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "conditions", columnDefinition = "jsonb")
    private Map<String, Object> conditions;
}

package com.utm.simulation.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.simulation.model.enumeration.SimulationStatus;
import com.utm.simulation.viewmodel.client.WaypointVm;
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

import java.util.List;
import java.util.Map;

@Entity
@Table(name = "simulation_session")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimulationSession extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "flight_id", length = 36)
    private String flightId;

    @Column(name = "mission_id", length = 36)
    private String missionId;

    @Column(name = "drone_id", length = 36, nullable = false)
    private String droneId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30, nullable = false)
    private SimulationStatus status;

    @Column(name = "flight_phase", length = 30)
    @Builder.Default
    private String flightPhase = "PREFLIGHT";

    @Column(name = "speed")
    private Double speed;

    @Column(name = "time_scale")
    private Double timeScale;

    @Column(name = "tick_rate")
    @Builder.Default
    private Double tickRate = 1.0;

    @Column(name = "current_lat")
    private Double currentLat;

    @Column(name = "current_lon")
    private Double currentLon;

    @Column(name = "current_alt")
    private Double currentAlt;

    @Column(name = "current_heading")
    private Double currentHeading;

    @Column(name = "current_battery")
    private Double currentBattery;

    @Column(name = "progress")
    private Double progress;

    @Column(name = "total_distance")
    private Double totalDistance;

    @Column(name = "traveled_distance")
    private Double traveledDistance;

    @Column(name = "current_segment")
    private Integer currentSegment;

    @Column(name = "active_scenario", length = 50)
    private String activeScenario;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "scenario_config", columnDefinition = "jsonb")
    private Map<String, Object> scenarioConfig;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "waypoints", columnDefinition = "jsonb")
    private List<WaypointVm> waypoints;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;
}

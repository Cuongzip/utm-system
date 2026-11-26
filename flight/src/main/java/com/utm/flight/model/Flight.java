package com.utm.flight.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.flight.model.enumeration.ConformanceStatus;
import com.utm.flight.model.enumeration.FlightAuthorizationStatus;
import com.utm.flight.model.enumeration.FlightOperationMode;
import com.utm.flight.model.enumeration.FlightStatus;
import com.utm.flight.model.enumeration.FlightType;
import com.utm.flight.model.enumeration.RiskAssessmentLevel;
import com.utm.flight.model.enumeration.Verdict;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
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
@Table(name = "flight")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Flight extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "flight_number", length = 100, nullable = false, unique = true)
    private String flightNumber;

    @Column(name = "drone_id", length = 36, nullable = false)
    private String droneId;

    @Column(name = "departure_hub_id", length = 36, nullable = false)
    private String departureHubId;

    @Column(name = "arrival_hub_id", length = 36, nullable = false)
    private String arrivalHubId;

    @Column(name = "pilot_id", length = 100)
    private String pilotId;

    @Enumerated(EnumType.STRING)
    @Column(name = "flight_type", length = 50, nullable = false)
    @Builder.Default
    private FlightType flightType = FlightType.DELIVERY;

    @Enumerated(EnumType.STRING)
    @Column(name = "operation_mode", length = 50, nullable = false)
    @Builder.Default
    private FlightOperationMode operationMode = FlightOperationMode.AUTONOMOUS;

    @Column(name = "scheduled_departure", nullable = false)
    private ZonedDateTime scheduledDeparture;

    @Column(name = "scheduled_arrival", nullable = false)
    private ZonedDateTime scheduledArrival;

    @Column(name = "actual_departure")
    private ZonedDateTime actualDeparture;

    @Column(name = "actual_arrival")
    private ZonedDateTime actualArrival;

    @Column(name = "cruising_altitude_m")
    private Double cruisingAltitudeM;

    @Column(name = "min_altitude_m")
    private Double minAltitudeM;

    @Column(name = "max_altitude_m")
    private Double maxAltitudeM;

    @Column(name = "authorization_number", length = 100, unique = true)
    private String authorizationNumber;

    @Column(name = "authorized_by", length = 100)
    private String authorizedBy;

    @Column(name = "authorized_at")
    private ZonedDateTime authorizedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_assessment", length = 30)
    private RiskAssessmentLevel riskAssessment;

    @Column(name = "mission_type", length = 50)
    private String missionType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "mission_data", columnDefinition = "jsonb")
    private Map<String, Object> missionData;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "weather_conditions", columnDefinition = "jsonb")
    private Map<String, Object> weatherConditions;

    @Column(name = "execution_id", length = 36)
    private String executionId;

    @Column(name = "mission_id", length = 36)
    private String missionId;

    @Column(name = "leg_index")
    private Integer legIndex;

    @Column(name = "total_legs")
    private Integer totalLegs;

    @Column(name = "depends_on_flight_id", length = 36)
    private String dependsOnFlightId;

    @Column(name = "payload_weight_kg", nullable = false)
    @Builder.Default
    private Double payloadWeightKg = 0.0;

    @Column(name = "expected_initial_battery_pct")
    private Double expectedInitialBatteryPct;

    @Column(name = "minimum_turnaround_minutes", nullable = false)
    @Builder.Default
    private Integer minimumTurnaroundMinutes = 0;

    @Column(name = "arrival_stopover_type", length = 30)
    @Builder.Default
    private String arrivalStopoverType = "none";

    @Transient
    private Double endingBatteryPct;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "planned_route", columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private GeoJsonLineString plannedRoute = GeoJsonLineString.empty();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "actual_route", columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private GeoJsonLineString actualRoute = GeoJsonLineString.empty();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "waypoints", columnDefinition = "jsonb")
    @Builder.Default
    private List<FlightWaypoint> waypoints = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "authorization_status", length = 50, nullable = false)
    @Builder.Default
    private FlightAuthorizationStatus authorizationStatus = FlightAuthorizationStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "conformance_status", length = 50, nullable = false)
    @Builder.Default
    private ConformanceStatus conformanceStatus = ConformanceStatus.CONFORMANT;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50, nullable = false)
    @Builder.Default
    private FlightStatus status = FlightStatus.SCHEDULED;

    @Enumerated(EnumType.STRING)
    @Column(name = "feasibility_verdict", length = 20, nullable = false)
    @Builder.Default
    private Verdict feasibilityVerdict = Verdict.UNKNOWN;

    @Column(name = "feasibility_override", columnDefinition = "TEXT")
    private String feasibilityOverride;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;
}

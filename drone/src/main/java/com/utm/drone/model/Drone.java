package com.utm.drone.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.drone.model.enumeration.CommunicationProtocol;
import com.utm.drone.model.enumeration.DroneStatus;
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
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "drone")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Drone extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "registration_number", length = 100, nullable = false, unique = true)
    private String registrationNumber;

    @Column(name = "serial_number", length = 100)
    private String serialNumber;

    @Column(name = "manufacturer", length = 100, nullable = false)
    private String manufacturer;

    @Column(name = "model", length = 100, nullable = false)
    private String model;

    @Column(name = "owner_id", length = 36)
    private String ownerId;

    @Column(name = "home_hub_id", length = 36)
    private String homeHubId;

    @Column(name = "current_hub_id", length = 36)
    private String currentHubId;

    @Column(name = "battery_capacity_wh", nullable = false)
    private Double batteryCapacityWh;

    @Column(name = "current_battery_pct", nullable = false)
    @Builder.Default
    private Double currentBatteryPct = 100.0;

    @Column(name = "max_payload", nullable = false)
    private Double maxPayload;

    @Column(name = "max_altitude", nullable = false)
    @Builder.Default
    private Double maxAltitude = 120.0;

    @Column(name = "max_speed", nullable = false)
    @Builder.Default
    private Double maxSpeed = 20.0;

    @Column(name = "hover_power_w", nullable = false)
    @Builder.Default
    private Double hoverPowerW = 350.0;

    @Column(name = "cruise_power_w", nullable = false)
    @Builder.Default
    private Double cruisePowerW = 280.0;

    @Column(name = "cruise_speed_ms", nullable = false)
    @Builder.Default
    private Double cruiseSpeedMs = 15.0;

    @Column(name = "battery_health_pct", nullable = false)
    @Builder.Default
    private Double batteryHealthPct = 100.0;

    @Column(name = "wind_tolerance_ms", nullable = false)
    @Builder.Default
    private Double windToleranceMs = 12.0;

    @Column(name = "max_flight_time_min", nullable = false)
    @Builder.Default
    private Integer maxFlightTimeMin = 40;

    @Column(name = "max_range_m", nullable = false)
    @Builder.Default
    private Double maxRangeM = 25000.0;

    @Enumerated(EnumType.STRING)
    @Column(name = "communication_protocol", length = 50, nullable = false)
    @Builder.Default
    private CommunicationProtocol communicationProtocol = CommunicationProtocol.WEBSOCKET;

    @Column(name = "remote_id", length = 100)
    private String remoteId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "capabilities", columnDefinition = "jsonb")
    private List<String> capabilities;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "specifications", columnDefinition = "jsonb")
    private Map<String, Object> specifications;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "telemetry_config", columnDefinition = "jsonb")
    private Map<String, Object> telemetryConfig;

    @Column(name = "last_maintenance")
    private ZonedDateTime lastMaintenance;

    @Column(name = "next_maintenance")
    private ZonedDateTime nextMaintenance;

    @Column(name = "total_flight_hours", nullable = false)
    @Builder.Default
    private Double totalFlightHours = 0.0;

    @Column(name = "total_flights", nullable = false)
    @Builder.Default
    private Integer totalFlights = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50, nullable = false)
    @Builder.Default
    private DroneStatus status = DroneStatus.AVAILABLE;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;
}

package com.utm.telemetry.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "telemetry_record")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TelemetryRecord extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "drone_id", length = 36, nullable = false)
    private String droneId;

    @Column(name = "flight_id", length = 36)
    private String flightId;

    @Column(name = "latitude", nullable = false)
    private Double latitude;

    @Column(name = "longitude", nullable = false)
    private Double longitude;

    @Column(name = "altitude", nullable = false)
    private Double altitude;

    @Column(name = "altitude_agl")
    private Double altitudeAgl;

    @Column(name = "speed")
    private Double speed;

    @Column(name = "vertical_speed")
    private Double verticalSpeed;

    @Column(name = "heading")
    private Double heading;

    @Column(name = "pitch")
    private Double pitch;

    @Column(name = "roll")
    private Double roll;

    @Column(name = "yaw")
    private Double yaw;

    @Column(name = "battery_percentage")
    private Double batteryPercentage;

    @Column(name = "battery_voltage")
    private Double batteryVoltage;

    @Column(name = "battery_temperature")
    private Double batteryTemperature;

    @Column(name = "battery_discharge_rate")
    private Double batteryDischargeRate;

    @Column(name = "signal_strength")
    private Double signalStrength;

    @Column(name = "gps_hdop")
    private Double gpsHdop;

    @Column(name = "gps_satellites")
    private Integer gpsSatellites;

    @Column(name = "flight_mode", length = 50)
    private String flightMode;

    @Column(name = "system_status", length = 50)
    private String systemStatus;

    @Column(name = "source", length = 50)
    private String source;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "motor_rpm", columnDefinition = "jsonb")
    private List<Double> motorRpm;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "warnings", columnDefinition = "jsonb")
    private List<String> warnings;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "errors", columnDefinition = "jsonb")
    private List<String> errors;

    @Column(name = "recorded_at", nullable = false)
    private ZonedDateTime recordedAt;
}

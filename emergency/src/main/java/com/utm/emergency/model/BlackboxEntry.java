package com.utm.emergency.model;

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

import java.time.ZonedDateTime;

@Entity
@Table(name = "blackbox_entries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BlackboxEntry extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "flight_id", length = 36, nullable = false)
    private String flightId;

    @Column(name = "drone_id", length = 36, nullable = false)
    private String droneId;

    @Column(name = "incident_id", length = 36)
    private String incidentId;

    @Column(name = "timestamp", nullable = false)
    private ZonedDateTime timestamp;

    @Column(name = "latitude", nullable = false)
    private Double latitude;

    @Column(name = "longitude", nullable = false)
    private Double longitude;

    @Column(name = "altitude_msl", nullable = false)
    private Double altitudeMsl;

    @Column(name = "altitude_agl")
    private Double altitudeAgl;

    @Column(name = "roll")
    private Double roll;

    @Column(name = "pitch")
    private Double pitch;

    @Column(name = "yaw")
    private Double yaw;

    @Column(name = "ground_speed", nullable = false)
    private Double groundSpeed;

    @Column(name = "vertical_speed")
    private Double verticalSpeed;

    @Column(name = "heading", nullable = false)
    private Double heading;

    @Column(name = "battery_level", nullable = false)
    private Double batteryLevel;

    @Column(name = "battery_voltage")
    private Double batteryVoltage;

    @Column(name = "battery_current")
    private Double batteryCurrent;

    @Column(name = "signal_strength", nullable = false)
    private Double signalStrength;

    @Column(name = "gps_satellites")
    private Integer gpsSatellites;

    @Column(name = "gps_hdop")
    private Double gpsHdop;

    @Column(name = "motor_rpm", columnDefinition = "TEXT")
    private String motorRpm;

    @Column(name = "motor_temps", columnDefinition = "TEXT")
    private String motorTemps;

    @Column(name = "command_received", length = 100)
    private String commandReceived;

    @Column(name = "command_executed", length = 100)
    private String commandExecuted;

    @Column(name = "emergency_active", nullable = false)
    @Builder.Default
    private boolean emergencyActive = false;

    @Column(name = "emergency_type", length = 50)
    private String emergencyType;

    @Column(name = "emergency_severity", length = 50)
    private String emergencySeverity;

    @Column(name = "flight_mode", length = 50)
    private String flightMode;

    @Column(name = "wind_speed")
    private Double windSpeed;

    @Column(name = "wind_direction")
    private Double windDirection;

    @Column(name = "temperature")
    private Double temperature;

    @Column(name = "humidity")
    private Double humidity;

    @Column(name = "is_emergency_recording", nullable = false)
    @Builder.Default
    private boolean isEmergencyRecording = false;
}
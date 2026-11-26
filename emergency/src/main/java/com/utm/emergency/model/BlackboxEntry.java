package com.utm.emergency.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
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

    @Column(name = "flight_id", length = 36)
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

    @Column(name = "ground_speed", nullable = false)
    private Double groundSpeed;

    @Column(name = "heading", nullable = false)
    private Double heading;

    @Column(name = "battery_level", nullable = false)
    private Double batteryLevel;

    @Column(name = "signal_strength", nullable = false)
    private Double signalStrength;

    @Column(name = "command_executed", length = 100)
    private String commandExecuted;

    @Column(name = "emergency_active", nullable = false)
    @Builder.Default
    private boolean emergencyActive = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "emergency_type", length = 50)
    private EmergencyType emergencyType;

    @Enumerated(EnumType.STRING)
    @Column(name = "emergency_severity", length = 50)
    private EmergencySeverity emergencySeverity;

    @Column(name = "is_emergency_recording", nullable = false)
    @Builder.Default
    private boolean isEmergencyRecording = false;
}

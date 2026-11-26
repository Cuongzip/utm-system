package com.utm.connectivity.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.connectivity.model.enumeration.DeviceConnectionStatus;
import com.utm.connectivity.model.enumeration.DeviceRegistrationStatus;
import com.utm.connectivity.model.enumeration.DeviceType;
import com.utm.connectivity.model.enumeration.TelemetryMode;
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
@Table(name = "device_registrations")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceRegistration extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(name = "device_type", length = 30, nullable = false)
    @Builder.Default
    private DeviceType deviceType = DeviceType.DRONE;

    @Column(name = "drone_id", length = 36)
    private String droneId;

    @Column(name = "hub_id", length = 36)
    private String hubId;

    @Column(name = "device_identifier", length = 100, nullable = false)
    private String deviceIdentifier;

    @Enumerated(EnumType.STRING)
    @Column(name = "registration_status", length = 30, nullable = false)
    @Builder.Default
    private DeviceRegistrationStatus registrationStatus = DeviceRegistrationStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(name = "connection_status", length = 50, nullable = false)
    @Builder.Default
    private DeviceConnectionStatus connectionStatus = DeviceConnectionStatus.OFFLINE;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "supported_protocols", columnDefinition = "jsonb")
    private List<String> supportedProtocols;

    @Column(name = "socket_id", length = 100)
    private String socketId;

    @Column(name = "certificate_fingerprint", length = 128)
    private String certificateFingerprint;

    @Enumerated(EnumType.STRING)
    @Column(name = "telemetry_mode", length = 30, nullable = false)
    @Builder.Default
    private TelemetryMode telemetryMode = TelemetryMode.NORMAL;

    @Column(name = "telemetry_mode_reason", length = 255)
    private String telemetryModeReason;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    private Map<String, Object> metadata;

    @Column(name = "last_seen_at")
    private ZonedDateTime lastSeenAt;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;
}

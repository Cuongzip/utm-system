package com.utm.connectivity.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.connectivity.model.enumeration.DeviceConnectionStatus;
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

    @Column(name = "drone_id", length = 36, nullable = false, unique = true)
    private String droneId;

    @Column(name = "device_identifier", length = 100, nullable = false, unique = true)
    private String deviceIdentifier;

    @Enumerated(EnumType.STRING)
    @Column(name = "connection_status", length = 50, nullable = false)
    @Builder.Default
    private DeviceConnectionStatus connectionStatus = DeviceConnectionStatus.OFFLINE;

    @Column(name = "socket_id", length = 100)
    private String socketId;

    @Column(name = "certificate_fingerprint", length = 128)
    private String certificateFingerprint;

    @Column(name = "last_seen_at")
    private ZonedDateTime lastSeenAt;
}

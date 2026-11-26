package com.utm.connectivity.model;

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
@Table(name = "device_certificates")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceCertificate extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "device_registration_id", length = 36, nullable = false)
    private String deviceRegistrationId;

    @Column(name = "certificate_pem", columnDefinition = "TEXT", nullable = false)
    private String certificatePem;

    @Column(name = "fingerprint", length = 128, nullable = false, unique = true)
    private String fingerprint;

    @Column(name = "common_name", length = 255, nullable = false)
    private String commonName;

    @Column(name = "serial_number", length = 100, nullable = false)
    private String serialNumber;

    @Column(name = "issued_at", nullable = false)
    private ZonedDateTime issuedAt;

    @Column(name = "expires_at", nullable = false)
    private ZonedDateTime expiresAt;

    @Column(name = "revoked_at")
    private ZonedDateTime revokedAt;

    @Column(name = "revocation_reason", length = 255)
    private String revocationReason;
}

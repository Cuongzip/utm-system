package com.utm.connectivity.viewmodel.certificate;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;

@Schema(description = "Active X.509 v3 device certificate metadata and public PEM (without private key)")
public record DeviceCertificateVm(
        String id,
        String deviceRegistrationId,
        String deviceIdentifier,
        String certificatePem,
        String caCertificatePem,
        String fingerprint,
        String commonName,
        String serialNumber,
        ZonedDateTime issuedAt,
        ZonedDateTime expiresAt,
        ZonedDateTime revokedAt,
        String revocationReason
) {
}

package com.utm.connectivity.viewmodel.certificate;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;

@Schema(description = "Newly issued X.509 v3 device certificate bundle including private key and Root CA")
public record DeviceCertificateBundleVm(
        @Schema(description = "PEM-encoded X.509 v3 device certificate")
        String certificatePem,

        @Schema(description = "PEM-encoded PKCS#8 RSA-2048 private key (returned once on issuance)")
        String privateKeyPem,

        @Schema(description = "PEM-encoded UTM Root CA X.509 v3 certificate")
        String caCertificatePem,

        @Schema(description = "SHA-256 certificate fingerprint (uppercase hex)")
        String fingerprint,

        @Schema(description = "Certificate Subject Common Name (CN)")
        String commonName,

        @Schema(description = "Certificate hexadecimal serial number")
        String serialNumber,

        @Schema(description = "Certificate validity start timestamp")
        ZonedDateTime issuedAt,

        @Schema(description = "Certificate expiration timestamp (90 days from issuance)")
        ZonedDateTime expiresAt
) {
}

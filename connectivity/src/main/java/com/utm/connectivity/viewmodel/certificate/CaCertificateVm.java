package com.utm.connectivity.viewmodel.certificate;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;

@Schema(description = "Public UTM Root CA X.509 v3 certificate")
public record CaCertificateVm(
        @Schema(description = "PEM-encoded UTM Root CA certificate")
        String caCertificatePem,

        @Schema(description = "CA Common Name", example = "UTM Root CA")
        String commonName,

        @Schema(description = "Root CA expiration timestamp")
        ZonedDateTime expiresAt
) {
}

package com.utm.connectivity.viewmodel.integration;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;
import java.util.List;

@Schema(description = "Manufacturer API key metadata (never includes raw key or hash)")
public record ManufacturerApiKeyVm(
        String id,
        String name,
        String manufacturerName,
        String keyPrefix,
        List<String> scopes,
        boolean isActive,
        ZonedDateTime expiresAt,
        ZonedDateTime lastUsedAt,
        ZonedDateTime revokedAt,
        ZonedDateTime createdOn,
        String createdBy
) {
}

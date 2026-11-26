package com.utm.connectivity.controller;

import com.utm.connectivity.service.IntegrationService;
import com.utm.connectivity.viewmodel.integration.IntegrationDroneRegisteredVm;
import com.utm.connectivity.viewmodel.integration.IntegrationRegisterDronePostVm;
import com.utm.connectivity.viewmodel.integration.IntegrationStatusVm;
import com.utm.connectivity.viewmodel.integration.IntegrationTelemetryPostVm;
import com.utm.connectivity.viewmodel.integration.IntegrationTelemetryResultVm;
import com.utm.connectivity.viewmodel.integration.ManufacturerApiKeyCreatedVm;
import com.utm.connectivity.viewmodel.integration.ManufacturerApiKeyPostVm;
import com.utm.connectivity.viewmodel.integration.ManufacturerApiKeyVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/integration")
@RequiredArgsConstructor
@Tag(name = "OEM 3rd-Party Integration", description = "Manufacturer API key management and X-API-Key hardware onboarding & telemetry")
public class IntegrationController {

    private final IntegrationService integrationService;

    @PostMapping("/keys")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Create a new OEM manufacturer API key")
    public ResponseEntity<ManufacturerApiKeyCreatedVm> createApiKey(@Valid @RequestBody ManufacturerApiKeyPostVm postVm) {
        return ResponseEntity.status(HttpStatus.CREATED).body(integrationService.createApiKey(postVm));
    }

    @GetMapping("/keys")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "List all OEM manufacturer API keys")
    public ResponseEntity<List<ManufacturerApiKeyVm>> listApiKeys() {
        return ResponseEntity.ok(integrationService.listApiKeys());
    }

    @PostMapping("/keys/{id}/revoke")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "Revoke an OEM manufacturer API key")
    public ResponseEntity<ManufacturerApiKeyVm> revokeApiKey(@PathVariable String id) {
        return ResponseEntity.ok(integrationService.revokeApiKey(id));
    }

    @PostMapping("/telemetry")
    @Operation(summary = "Ingest OEM telemetry authenticated via X-API-Key header")
    public ResponseEntity<IntegrationTelemetryResultVm> ingestOemTelemetry(
            @RequestHeader(value = "X-API-Key", required = false) String rawApiKey,
            @Valid @RequestBody IntegrationTelemetryPostVm postVm) {
        return ResponseEntity.ok(integrationService.ingestManufacturerTelemetry(rawApiKey, postVm));
    }

    @PostMapping("/register")
    @Operation(summary = "Register OEM drone and hardware device via X-API-Key header")
    public ResponseEntity<IntegrationDroneRegisteredVm> registerDrone(
            @RequestHeader(value = "X-API-Key", required = false) String rawApiKey,
            @Valid @RequestBody IntegrationRegisterDronePostVm postVm) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(integrationService.registerManufacturerDrone(rawApiKey, postVm));
    }

    @GetMapping("/status")
    @Operation(summary = "Get OEM manufacturer fleet connectivity status via X-API-Key header")
    public ResponseEntity<IntegrationStatusVm> getStatus(
            @RequestHeader(value = "X-API-Key", required = false) String rawApiKey) {
        return ResponseEntity.ok(integrationService.getManufacturerStatus(rawApiKey));
    }
}

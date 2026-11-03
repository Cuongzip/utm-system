package com.utm.emergency.controller;

import com.utm.emergency.service.EmergencyConfigService;
import com.utm.emergency.viewmodel.config.ConfigValueVm;
import com.utm.emergency.viewmodel.config.EmergencyConfigVm;
import com.utm.emergency.viewmodel.config.EmergencySystemConfigVm;
import com.utm.emergency.viewmodel.config.OperationModeVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/v1/emergency/config", "/emergency/config"})
@Tag(name = "Emergency Configuration", description = "Endpoints for emergency system runtime configuration and operation mode")
@RequiredArgsConstructor
public class EmergencyConfigController {

    private final EmergencyConfigService configService;

    @GetMapping
    @Operation(summary = "Get emergency system operation mode and configs")
    public EmergencySystemConfigVm getConfig() {
        return configService.getSystemConfig();
    }

    @PutMapping("/mode")
    @PreAuthorize("hasAnyRole('admin', 'atc')")
    @Operation(summary = "Switch decision engine operation mode: auto or supervised")
    public OperationModeVm setMode(@Valid @RequestBody OperationModeVm body) {
        return configService.setMode(body.mode());
    }

    @PutMapping("/{key}")
    @PreAuthorize("hasAnyRole('admin', 'atc')")
    @Operation(summary = "Set dynamic emergency configuration value by key")
    public EmergencyConfigVm setConfig(
            @PathVariable String key,
            @Valid @RequestBody ConfigValueVm body
    ) {
        return configService.setConfig(key, body);
    }
}


package com.utm.emergency.controller;

import com.utm.emergency.service.EmergencyProtocolService;
import com.utm.emergency.viewmodel.protocol.EmergencyProtocolPostVm;
import com.utm.emergency.viewmodel.protocol.EmergencyProtocolPutVm;
import com.utm.emergency.viewmodel.protocol.EmergencyProtocolVm;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({ "/api/v1/emergency/protocols", "/emergency/protocols" })
@Tag(name = "Emergency Protocols", description = "Endpoints for configuring and querying automated emergency response protocols")
@RequiredArgsConstructor
public class EmergencyProtocolController {

    private final EmergencyProtocolService protocolService;

    @GetMapping
    @Operation(summary = "List standard emergency response protocols")
    public ResponseEntity<List<EmergencyProtocolVm>> getProtocols(@RequestParam(required = false) Boolean active) {
        return ResponseEntity.ok(protocolService.getProtocols(active));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get emergency protocol details by ID")
    public ResponseEntity<EmergencyProtocolVm> getProtocol(@PathVariable String id) {
        return ResponseEntity.ok(protocolService.getProtocolById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('admin', 'atc')")
    @Operation(summary = "Update emergency protocol configuration")
    public ResponseEntity<EmergencyProtocolVm> updateProtocol(
            @PathVariable String id,
            @Valid @RequestBody EmergencyProtocolPutVm body) {
        return ResponseEntity.ok(protocolService.updateProtocol(id, body));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('admin', 'atc')")
    @Operation(summary = "Create custom emergency protocol")
    public ResponseEntity<EmergencyProtocolVm> createProtocol(@Valid @RequestBody EmergencyProtocolPostVm body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(protocolService.createProtocol(body));
    }
}

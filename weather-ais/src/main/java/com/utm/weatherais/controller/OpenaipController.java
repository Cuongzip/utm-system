package com.utm.weatherais.controller;

import com.utm.weatherais.service.OpenaipService;
import com.utm.weatherais.viewmodel.openaip.OpenaipFeedVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/api/v1/openaip")
@RequiredArgsConstructor
@Tag(name = "openAIP", description = "National airspace structure and raster map tile proxy")
public class OpenaipController {

    private final OpenaipService openaipService;

    @GetMapping("/airspaces")
    @Operation(summary = "Get aeronautical airspace structures from openAIP")
    public ResponseEntity<OpenaipFeedVm> getAirspaces(@RequestParam(required = false) String country) {
        return ResponseEntity.ok(openaipService.getAirspaces(country));
    }

    @GetMapping("/tiles/{z}/{x}/{y}")
    @Operation(summary = "Public raster PNG map tile proxy for openAIP")
    public ResponseEntity<byte[]> getTile(
            @PathVariable int z,
            @PathVariable int x,
            @PathVariable int y) {
        return openaipService.getTile(z, x, y)
                .map(bytes -> ResponseEntity.ok()
                        .contentType(MediaType.IMAGE_PNG)
                        .cacheControl(CacheControl.maxAge(Duration.ofDays(1)).cachePublic())
                        .body(bytes))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }
}

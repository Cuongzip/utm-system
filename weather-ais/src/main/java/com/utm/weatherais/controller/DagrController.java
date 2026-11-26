package com.utm.weatherais.controller;

import com.utm.weatherais.service.DagrService;
import com.utm.weatherais.viewmodel.dagr.DagrConfigVm;
import com.utm.weatherais.viewmodel.dagr.DagrConfigVm.DagrCheckPointsPostVm;
import com.utm.weatherais.viewmodel.dagr.DagrConfigVm.DagrCheckPointsResponseVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/dagr")
@RequiredArgsConstructor
@Tag(name = "DAGR / WMS", description = "OGC WMS 1.3.0 aeronautical drone zone overlay and point checks")
public class DagrController {

    private final DagrService dagrService;

    @GetMapping("/config")
    @Operation(summary = "Get WMS endpoint and layer configuration")
    public ResponseEntity<DagrConfigVm> getConfig() {
        return ResponseEntity.ok(dagrService.getConfig());
    }

    @GetMapping("/feature-info")
    @Operation(summary = "Proxy OGC WMS GetFeatureInfo query")
    public ResponseEntity<Map<String, Object>> getFeatureInfo(@RequestParam Map<String, String> query) {
        return ResponseEntity.ok(dagrService.getFeatureInfo(query));
    }

    @PostMapping("/check-points")
    @Operation(summary = "Check waypoints against OGC WMS drone restriction zones")
    public ResponseEntity<DagrCheckPointsResponseVm> checkPoints(@Valid @RequestBody DagrCheckPointsPostVm body) {
        return ResponseEntity.ok(dagrService.checkPoints(body.points()));
    }
}

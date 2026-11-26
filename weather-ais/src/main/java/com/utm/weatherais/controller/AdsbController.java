package com.utm.weatherais.controller;

import com.utm.weatherais.service.AdsbService;
import com.utm.weatherais.viewmodel.adsb.AdsbFeedVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/adsb")
@RequiredArgsConstructor
@Tag(name = "ADS-B", description = "Live manned-aircraft surveillance feed")
public class AdsbController {

    private final AdsbService adsbService;

    @GetMapping("/aircraft")
    @Operation(summary = "Get live manned-aircraft ADS-B positions")
    public ResponseEntity<AdsbFeedVm> getAircraft() {
        return ResponseEntity.ok(adsbService.getAircraft());
    }
}

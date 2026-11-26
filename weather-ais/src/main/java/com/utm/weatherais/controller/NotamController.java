package com.utm.weatherais.controller;

import com.utm.weatherais.service.NotamService;
import com.utm.weatherais.viewmodel.notam.NotamFeedVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notam")
@RequiredArgsConstructor
@Tag(name = "NOTAM", description = "Active aeronautical Notices to Air Missions")
public class NotamController {

    private final NotamService notamService;

    @GetMapping
    @Operation(summary = "Get active NOTAMs for FIRs and aerodromes")
    public ResponseEntity<NotamFeedVm> getNotams(@RequestParam(required = false) String icaos) {
        return ResponseEntity.ok(notamService.getNotams(icaos));
    }
}

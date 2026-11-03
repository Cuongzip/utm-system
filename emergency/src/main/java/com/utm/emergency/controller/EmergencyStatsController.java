package com.utm.emergency.controller;

import com.utm.emergency.service.EmergencyIncidentService;
import com.utm.emergency.viewmodel.stats.EmergencyStatsVm;
import com.utm.emergency.viewmodel.stats.EmergencyTrendVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.ZonedDateTime;
import java.util.List;

@RestController
@RequestMapping({"/api/v1/emergency/stats", "/emergency/stats"})
@Tag(name = "Emergency Statistics", description = "Endpoints for aggregate emergency statistics and incident safety trends")
@RequiredArgsConstructor
public class EmergencyStatsController {

    private final EmergencyIncidentService incidentService;

    @GetMapping
    @Operation(summary = "Aggregate emergency incidents safety statistics")
    public EmergencyStatsVm getStats(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) ZonedDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) ZonedDateTime to
    ) {
        return incidentService.getStats(from, to);
    }

    @GetMapping("/trends")
    @Operation(summary = "Get time-series trends of emergency incidents")
    public List<EmergencyTrendVm> getTrends(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) ZonedDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) ZonedDateTime to,
            @RequestParam(defaultValue = "day") String interval
    ) {
        return incidentService.getTrends(from, to, interval);
    }
}


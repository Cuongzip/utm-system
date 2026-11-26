package com.utm.intelligence.controller;

import com.utm.intelligence.service.BriefingService;
import com.utm.intelligence.viewmodel.IntelligenceDtos.FlightAssessmentVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.FlightBriefingVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/briefing")
@RequiredArgsConstructor
@Tag(name = "Pre-Flight Briefing", description = "Consolidated weather, airspace, ADS-B traffic, NOTAM briefing and AI authorization assessment")
public class BriefingController {

    private final BriefingService briefingService;

    @GetMapping("/flight/{id}")
    @Operation(summary = "Consolidated pre-flight briefing (weather + airspace + traffic + NOTAM)")
    public ResponseEntity<FlightBriefingVm> getFlightBriefing(@PathVariable String id) {
        return ResponseEntity.ok(briefingService.getFlightBriefing(id));
    }

    @GetMapping("/flight/{id}/assess")
    @Operation(summary = "AI / deterministic pre-flight authorization assessment (GO / GO_WITH_CONDITIONS / NO_GO)")
    public ResponseEntity<FlightAssessmentVm> assessFlight(@PathVariable String id) {
        return ResponseEntity.ok(briefingService.assessFlight(id));
    }
}

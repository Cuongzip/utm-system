package com.utm.emergency.controller;

import com.utm.emergency.service.BlackboxService;
import com.utm.emergency.viewmodel.blackbox.BlackboxEntryVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.ZonedDateTime;
import java.util.List;

@RestController
@RequestMapping({"/api/v1/emergency", "/emergency"})
@Tag(name = "Emergency Blackbox", description = "Endpoints for retrieving high-frequency flight blackbox telemetry")
@RequiredArgsConstructor
public class BlackboxController {

    private final BlackboxService blackboxService;

    @GetMapping("/incidents/{id}/blackbox")
    @Operation(summary = "Get high-frequency blackbox data recorded during incident")
    public List<BlackboxEntryVm> getIncidentBlackbox(
            @PathVariable String id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) ZonedDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) ZonedDateTime to
    ) {
        return blackboxService.getIncidentBlackbox(id, from, to);
    }

    @GetMapping("/blackbox/flight/{flightId}")
    @Operation(summary = "Get blackbox recording stream for a flight")
    public List<BlackboxEntryVm> getFlightBlackbox(
            @PathVariable String flightId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) ZonedDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) ZonedDateTime to,
            @RequestParam(defaultValue = "1000") int limit
    ) {
        return blackboxService.getFlightBlackbox(flightId, from, to, limit);
    }
}


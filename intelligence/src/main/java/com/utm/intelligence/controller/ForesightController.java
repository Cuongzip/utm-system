package com.utm.intelligence.controller;

import com.utm.intelligence.service.ForesightService;
import com.utm.intelligence.viewmodel.IntelligenceDtos.DemoStateVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.DirectorAdviceVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.ForesightAdvisePostVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.ForesightSimulatePostVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.ForesightTimelineVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/foresight")
@RequiredArgsConstructor
@Tag(name = "4D Foresight Deconfliction", description = "Look-ahead 4D CPA prediction, Air Traffic Director maneuver options, and preview simulation")
public class ForesightController {

    private final ForesightService foresightService;

    @GetMapping("/predict")
    @Operation(summary = "Predict airspace trajectories N seconds ahead and surface CPA conflicts")
    public ResponseEntity<ForesightTimelineVm> predict(
            @RequestParam(required = false) Integer horizon,
            @RequestParam(required = false) Integer step) {
        return ResponseEntity.ok(foresightService.predict(horizon, step, List.of()));
    }

    @PostMapping("/advise")
    @Operation(summary = "Air Traffic Director: 3 ranked resolution options (hold / altitude / lateral)")
    public ResponseEntity<DirectorAdviceVm> advise(
            @RequestBody(required = false) ForesightAdvisePostVm postVm) {
        return ResponseEntity.ok(foresightService.advise(postVm != null ? postVm.conflict() : null));
    }

    @PostMapping("/simulate-resolution")
    @Operation(summary = "Preview re-prediction with candidate resolution maneuvers applied")
    public ResponseEntity<ForesightTimelineVm> simulateResolution(
            @RequestBody(required = false) ForesightSimulatePostVm postVm) {
        return ResponseEntity.ok(foresightService.predict(
                postVm != null ? postVm.horizon() : null,
                postVm != null ? postVm.step() : null,
                postVm != null && postVm.maneuvers() != null ? postVm.maneuvers() : List.of()));
    }

    @PostMapping("/demo/start")
    @PreAuthorize("hasAnyRole('pilot', 'hub_operator', 'atc', 'admin')")
    @Operation(summary = "Activate scripted Vietnam converging-drone conflict scenario")
    public ResponseEntity<DemoStateVm> startDemo() {
        return ResponseEntity.ok(foresightService.startDemo());
    }

    @PostMapping("/demo/reset")
    @PreAuthorize("hasAnyRole('pilot', 'hub_operator', 'atc', 'admin')")
    @Operation(summary = "Clear scripted demo conflict scenario")
    public ResponseEntity<DemoStateVm> resetDemo() {
        return ResponseEntity.ok(foresightService.resetDemo());
    }
}

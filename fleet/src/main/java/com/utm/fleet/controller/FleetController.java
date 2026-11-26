package com.utm.fleet.controller;

import com.utm.fleet.service.FleetService;
import com.utm.fleet.viewmodel.FleetDtos.ApproveRebalancingPostVm;
import com.utm.fleet.viewmodel.FleetDtos.AssignDronePostVm;
import com.utm.fleet.viewmodel.FleetDtos.AssignmentResultVm;
import com.utm.fleet.viewmodel.FleetDtos.CancelRebalancingPostVm;
import com.utm.fleet.viewmodel.FleetDtos.CreateRebalancingPostVm;
import com.utm.fleet.viewmodel.FleetDtos.DroneAvailabilityVm;
import com.utm.fleet.viewmodel.FleetDtos.DroneClientVm;
import com.utm.fleet.viewmodel.FleetDtos.FleetAssignmentVm;
import com.utm.fleet.viewmodel.FleetDtos.FleetConfigPostVm;
import com.utm.fleet.viewmodel.FleetDtos.FleetConfigPutVm;
import com.utm.fleet.viewmodel.FleetDtos.FleetConfigurationVm;
import com.utm.fleet.viewmodel.FleetDtos.FleetOverviewVm;
import com.utm.fleet.viewmodel.FleetDtos.HubFleetStatusVm;
import com.utm.fleet.viewmodel.FleetDtos.RebalancingRecommendationVm;
import com.utm.fleet.viewmodel.FleetDtos.RebalancingTaskVm;
import com.utm.fleet.viewmodel.FleetDtos.RejectAssignmentPostVm;
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
@RequestMapping("/api/v1/fleet")
@RequiredArgsConstructor
@Tag(name = "Fleet Orchestration", description = "Fleet overview, multi-factor drone scoring & assignment, configuration presets, and hub rebalancing")
public class FleetController {

    private final FleetService fleetService;

    @GetMapping("/overview")
    @Operation(summary = "Get fleet-wide operational overview")
    public ResponseEntity<FleetOverviewVm> getFleetOverview() {
        return ResponseEntity.ok(fleetService.getFleetOverview());
    }

    @GetMapping("/hubs/{hubId}/status")
    @Operation(summary = "Get fleet status breakdown at a specific hub")
    public ResponseEntity<HubFleetStatusVm> getHubStatus(@PathVariable String hubId) {
        return ResponseEntity.ok(fleetService.getHubStatus(hubId));
    }

    @GetMapping("/hubs/{hubId}/drones")
    @Operation(summary = "List drones stationed at a specific hub")
    public ResponseEntity<List<DroneClientVm>> getDronesAtHub(@PathVariable String hubId) {
        return ResponseEntity.ok(fleetService.getDronesAtHub(hubId));
    }

    @GetMapping("/available")
    @Operation(summary = "Get drone availability matrix across fleet or hub")
    public ResponseEntity<List<DroneAvailabilityVm>> getAvailableDrones(
            @RequestParam(required = false) String hubId) {
        return ResponseEntity.ok(fleetService.getAvailableDrones(hubId));
    }

    @PostMapping("/assign")
    @PreAuthorize("hasAnyRole('hub_operator', 'pilot', 'atc', 'admin')")
    @Operation(summary = "Score and assign optimal drone to a mission")
    public ResponseEntity<AssignmentResultVm> assignDrone(@Valid @RequestBody AssignDronePostVm postVm) {
        return ResponseEntity.ok(fleetService.assignDrone(postVm));
    }

    @PostMapping("/assignments/{id}/accept")
    @PreAuthorize("hasAnyRole('hub_operator', 'pilot', 'atc', 'admin')")
    @Operation(summary = "Accept a pending drone assignment and update drone/mission")
    public ResponseEntity<FleetAssignmentVm> acceptAssignment(@PathVariable String id) {
        return ResponseEntity.ok(fleetService.acceptAssignment(id));
    }

    @PostMapping("/assignments/{id}/reject")
    @PreAuthorize("hasAnyRole('hub_operator', 'pilot', 'atc', 'admin')")
    @Operation(summary = "Reject a pending drone assignment and optionally assign alternative")
    public ResponseEntity<FleetAssignmentVm> rejectAssignment(
            @PathVariable String id,
            @RequestBody(required = false) RejectAssignmentPostVm postVm) {
        return ResponseEntity.ok(fleetService.rejectAssignment(id, postVm));
    }

    @GetMapping("/assignments/mission/{missionId}")
    @Operation(summary = "Get assignment history for a mission")
    public ResponseEntity<List<FleetAssignmentVm>> getAssignmentHistory(@PathVariable String missionId) {
        return ResponseEntity.ok(fleetService.getAssignmentHistory(missionId));
    }

    @GetMapping("/rebalancing/analyze")
    @Operation(summary = "Analyze fleet imbalances and generate rebalancing recommendations")
    public ResponseEntity<List<RebalancingRecommendationVm>> analyzeRebalancing() {
        return ResponseEntity.ok(fleetService.analyzeRebalancingNeeds());
    }

    @GetMapping("/rebalancing/pending")
    @Operation(summary = "List pending rebalancing tasks awaiting approval")
    public ResponseEntity<List<RebalancingTaskVm>> getPendingRebalancing() {
        return ResponseEntity.ok(fleetService.getPendingRebalancingTasks());
    }

    @GetMapping("/rebalancing/active")
    @Operation(summary = "List approved or in-progress rebalancing tasks")
    public ResponseEntity<List<RebalancingTaskVm>> getActiveRebalancing() {
        return ResponseEntity.ok(fleetService.getActiveRebalancingTasks());
    }

    @GetMapping("/rebalancing/history")
    @Operation(summary = "Get historical rebalancing tasks")
    public ResponseEntity<List<RebalancingTaskVm>> getRebalancingHistory(
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return ResponseEntity.ok(fleetService.getRebalancingHistory(limit, offset));
    }

    @PostMapping("/rebalancing")
    @PreAuthorize("hasAnyRole('hub_operator', 'atc', 'admin')")
    @Operation(summary = "Create a manual rebalancing task")
    public ResponseEntity<RebalancingTaskVm> createRebalancingTask(
            @Valid @RequestBody CreateRebalancingPostVm postVm) {
        return ResponseEntity.status(HttpStatus.CREATED).body(fleetService.createRebalancingTask(postVm));
    }

    @PostMapping("/rebalancing/{id}/approve")
    @PreAuthorize("hasAnyRole('hub_operator', 'atc', 'admin')")
    @Operation(summary = "Approve a pending rebalancing task")
    public ResponseEntity<RebalancingTaskVm> approveRebalancingTask(
            @PathVariable String id,
            @RequestBody(required = false) ApproveRebalancingPostVm postVm) {
        return ResponseEntity.ok(fleetService.approveRebalancingTask(id, postVm));
    }

    @PostMapping("/rebalancing/{id}/execute")
    @PreAuthorize("hasAnyRole('hub_operator', 'atc', 'admin')")
    @Operation(summary = "Execute an approved rebalancing task (dispatches repositioning mission/flight)")
    public ResponseEntity<RebalancingTaskVm> executeRebalancingTask(@PathVariable String id) {
        return ResponseEntity.ok(fleetService.executeRebalancingTask(id));
    }

    @PostMapping("/rebalancing/{id}/cancel")
    @PreAuthorize("hasAnyRole('hub_operator', 'atc', 'admin')")
    @Operation(summary = "Cancel a rebalancing task")
    public ResponseEntity<RebalancingTaskVm> cancelRebalancingTask(
            @PathVariable String id,
            @RequestBody(required = false) CancelRebalancingPostVm postVm) {
        return ResponseEntity.ok(fleetService.cancelRebalancingTask(id, postVm));
    }

    @PostMapping("/rebalancing/{id}/complete")
    @PreAuthorize("hasAnyRole('hub_operator', 'atc', 'admin')")
    @Operation(summary = "Complete an in-progress rebalancing task and update drone hub")
    public ResponseEntity<RebalancingTaskVm> completeRebalancingTask(@PathVariable String id) {
        return ResponseEntity.ok(fleetService.completeRebalancingTask(id));
    }

    @GetMapping("/config")
    @Operation(summary = "Get active fleet scoring & threshold configuration")
    public ResponseEntity<FleetConfigurationVm> getActiveConfig() {
        return ResponseEntity.ok(fleetService.getActiveConfig());
    }

    @GetMapping("/config/all")
    @Operation(summary = "List all fleet configurations including presets")
    public ResponseEntity<List<FleetConfigurationVm>> getAllConfigs() {
        return ResponseEntity.ok(fleetService.getAllConfigs());
    }

    @GetMapping("/config/{id}")
    @Operation(summary = "Get fleet configuration by ID")
    public ResponseEntity<FleetConfigurationVm> getConfigById(@PathVariable String id) {
        return ResponseEntity.ok(fleetService.getConfigById(id));
    }

    @PostMapping("/config")
    @PreAuthorize("hasAnyRole('hub_operator', 'admin')")
    @Operation(summary = "Create custom fleet scoring & threshold configuration")
    public ResponseEntity<FleetConfigurationVm> createConfig(@Valid @RequestBody FleetConfigPostVm postVm) {
        return ResponseEntity.status(HttpStatus.CREATED).body(fleetService.createConfig(postVm));
    }

    @PutMapping("/config/{id}")
    @PreAuthorize("hasAnyRole('hub_operator', 'admin')")
    @Operation(summary = "Update custom fleet configuration (presets are immutable)")
    public ResponseEntity<FleetConfigurationVm> updateConfig(
            @PathVariable String id,
            @Valid @RequestBody FleetConfigPutVm putVm) {
        return ResponseEntity.ok(fleetService.updateConfig(id, putVm));
    }

    @PostMapping("/config/{id}/activate")
    @PreAuthorize("hasAnyRole('hub_operator', 'admin')")
    @Operation(summary = "Activate a fleet configuration profile")
    public ResponseEntity<FleetConfigurationVm> activateConfig(@PathVariable String id) {
        return ResponseEntity.ok(fleetService.activateConfig(id));
    }
}

package com.utm.simulation.controller;

import com.utm.simulation.service.SimulationService;
import com.utm.simulation.viewmodel.InjectScenarioResultVm;
import com.utm.simulation.viewmodel.InjectScenarioVm;
import com.utm.simulation.viewmodel.ScenarioCatalogVm;
import com.utm.simulation.viewmodel.SimulationSessionCreateVm;
import com.utm.simulation.viewmodel.SimulationSessionVm;
import com.utm.simulation.viewmodel.TimeScaleUpdateVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/simulation")
@RequiredArgsConstructor
@Tag(name = "Flight Simulation Engine", description = "Endpoints for managing drone flight simulations, time-scale acceleration, and emergency scenario injection")
public class SimulationController {

        private final SimulationService simulationService;

        @PostMapping("/sessions")
        @Operation(summary = "Create and launch simulation session", description = "Start virtual flight simulation for a flight plan. Drone ID, departure/arrival hubs, and route waypoints are automatically retrieved from the flight plan.")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "201", description = "Simulation session created and started", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = SimulationSessionVm.class))),
                        @ApiResponse(responseCode = "400", description = "Invalid request payload or insufficient flight waypoints", content = @Content),
                        @ApiResponse(responseCode = "404", description = "Flight plan not found", content = @Content),
                        @ApiResponse(responseCode = "409", description = "Drone already has an active simulation", content = @Content)
        })
        public ResponseEntity<SimulationSessionVm> createSession(
                        @Valid @RequestBody SimulationSessionCreateVm createVm) {
                SimulationSessionVm session = simulationService.createSession(createVm);
                return ResponseEntity.status(HttpStatus.CREATED).body(session);
        }

        @GetMapping("/sessions")
        @Operation(summary = "List all simulation sessions", description = "Retrieve history of all simulation sessions.")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "List of all simulation sessions", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, array = @ArraySchema(schema = @Schema(implementation = SimulationSessionVm.class))))
        })
        public ResponseEntity<List<SimulationSessionVm>> getAllSessions() {
                return ResponseEntity.ok(simulationService.getAllSessions());
        }

        @GetMapping("/sessions/active")
        @Operation(summary = "List active simulation sessions", description = "Retrieve all currently running or paused simulation sessions.")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "List of active simulation sessions", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, array = @ArraySchema(schema = @Schema(implementation = SimulationSessionVm.class))))
        })
        public ResponseEntity<List<SimulationSessionVm>> getActiveSessions() {
                return ResponseEntity.ok(simulationService.getActiveSessions());
        }

        @GetMapping("/sessions/{id}")
        @Operation(summary = "Get simulation session by ID", description = "Retrieve status, progress, current position and metrics for a specific simulation session.")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "Simulation session details", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = SimulationSessionVm.class))),
                        @ApiResponse(responseCode = "404", description = "Simulation session not found", content = @Content)
        })
        public ResponseEntity<SimulationSessionVm> getSessionById(
                        @Parameter(description = "Simulation session UUID", required = true) @PathVariable String id) {
                return ResponseEntity.ok(simulationService.getSessionById(id));
        }

        @DeleteMapping("/sessions/{id}")
        @Operation(summary = "Delete simulation session", description = "Stops active session if running and permanently deletes session record and events.")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "204", description = "Simulation session deleted successfully", content = @Content),
                        @ApiResponse(responseCode = "404", description = "Simulation session not found", content = @Content)
        })
        public ResponseEntity<Void> deleteSession(
                        @Parameter(description = "Simulation session UUID", required = true) @PathVariable String id) {
                simulationService.deleteSession(id);
                return ResponseEntity.noContent().build();
        }

        @PatchMapping("/sessions/{id}/pause")
        @Operation(summary = "Pause simulation session", description = "Pauses active telemetry generation for the specified session.")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "Simulation session paused", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = SimulationSessionVm.class))),
                        @ApiResponse(responseCode = "400", description = "Invalid simulation state transition", content = @Content),
                        @ApiResponse(responseCode = "404", description = "Simulation session not found", content = @Content)
        })
        public ResponseEntity<SimulationSessionVm> pauseSession(
                        @Parameter(description = "Simulation session UUID", required = true) @PathVariable String id) {
                return ResponseEntity.ok(simulationService.pauseSession(id));
        }

        @PatchMapping("/sessions/{id}/resume")
        @Operation(summary = "Resume simulation session", description = "Resumes a paused simulation session.")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "Simulation session resumed", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = SimulationSessionVm.class))),
                        @ApiResponse(responseCode = "400", description = "Invalid simulation state transition", content = @Content),
                        @ApiResponse(responseCode = "404", description = "Simulation session not found", content = @Content)
        })
        public ResponseEntity<SimulationSessionVm> resumeSession(
                        @Parameter(description = "Simulation session UUID", required = true) @PathVariable String id) {
                return ResponseEntity.ok(simulationService.resumeSession(id));
        }

        @PatchMapping("/sessions/{id}/time-scale")
        @Operation(summary = "Update simulation time-scale", description = "Dynamically adjust simulation speed acceleration factor (0.1x to 20x).")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "Simulation time-scale updated", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = SimulationSessionVm.class))),
                        @ApiResponse(responseCode = "400", description = "Invalid timeScale parameter or simulation state", content = @Content),
                        @ApiResponse(responseCode = "404", description = "Simulation session not found", content = @Content)
        })
        public ResponseEntity<SimulationSessionVm> updateTimeScale(
                        @Parameter(description = "Simulation session UUID", required = true) @PathVariable String id,
                        @Valid @RequestBody TimeScaleUpdateVm updateVm) {
                return ResponseEntity.ok(simulationService.updateTimeScale(id, updateVm.timeScale()));
        }

        @PostMapping("/sessions/{id}/inject-scenario")
        @Operation(summary = "Inject emergency simulation scenario", description = "Inject abnormal events such as GPS failure, battery drain, C2 lost, motor failure, or geofence breach.")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "Emergency scenario injected successfully", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = InjectScenarioResultVm.class))),
                        @ApiResponse(responseCode = "400", description = "Invalid scenario configuration or simulation state", content = @Content),
                        @ApiResponse(responseCode = "404", description = "Simulation session not found", content = @Content)
        })
        public ResponseEntity<InjectScenarioResultVm> injectScenario(
                        @Parameter(description = "Simulation session UUID", required = true) @PathVariable String id,
                        @Valid @RequestBody InjectScenarioVm injectVm) {
                return ResponseEntity.ok(simulationService.injectScenario(id, injectVm));
        }

        @PostMapping("/sessions/{id}/stop")
        @Operation(summary = "Stop simulation session", description = "Stops the simulation while retaining session statistics and telemetry history.")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "Simulation session stopped", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = SimulationSessionVm.class))),
                        @ApiResponse(responseCode = "400", description = "Invalid simulation state transition", content = @Content),
                        @ApiResponse(responseCode = "404", description = "Simulation session not found", content = @Content)
        })
        public ResponseEntity<SimulationSessionVm> stopSession(
                        @Parameter(description = "Simulation session UUID", required = true) @PathVariable String id) {
                return ResponseEntity.ok(simulationService.stopSession(id));
        }

        @GetMapping("/scenarios")
        @Operation(summary = "Get scenario catalog", description = "Retrieve catalog of supported emergency scenarios and their descriptions.")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "List of supported scenario types", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, array = @ArraySchema(schema = @Schema(implementation = ScenarioCatalogVm.class))))
        })
        public ResponseEntity<List<ScenarioCatalogVm>> getScenarioCatalog() {
                return ResponseEntity.ok(simulationService.getScenarioCatalog());
        }
}

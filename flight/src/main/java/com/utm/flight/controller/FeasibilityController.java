package com.utm.flight.controller;

import com.utm.flight.service.FeasibilityService;
import com.utm.flight.viewmodel.FeasibilityCheckPostVm;
import com.utm.flight.viewmodel.FeasibilityEvaluationListVm;
import com.utm.flight.viewmodel.FeasibilityOverridePostVm;
import com.utm.flight.viewmodel.FeasibilityResultVm;
import com.utm.flight.viewmodel.FlightVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Flight Feasibility & Energy Evaluation", description = "Endpoints for pre-flight energy evaluation, physical simulation, and ATC feasibility override")
public class FeasibilityController {

    private final FeasibilityService feasibilityService;

    @PostMapping(value = "/flights/{flightId}/feasibility/check", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('pilot', 'hub_operator', 'atc', 'admin')")
    @Operation(summary = "Check flight feasibility and energy profile", description = "Runs deterministic physics energy model on the assigned drone and route geometry.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Feasibility evaluated successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = FeasibilityResultVm.class))),
            @ApiResponse(responseCode = "404", description = "Flight or Drone not found", content = @Content)
    })
    public ResponseEntity<FeasibilityResultVm> checkFeasibility(
            @Parameter(description = "Flight UUID identifier", required = true)
            @PathVariable String flightId,
            @RequestBody(required = false) FeasibilityCheckPostVm request) {
        FeasibilityResultVm result = feasibilityService.checkFeasibility(flightId, request);
        return ResponseEntity.ok(result);
    }

    @PostMapping(value = "/flights/{flightId}/feasibility/override", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('atc', 'admin')")
    @Operation(summary = "Override feasibility verdict", description = "Allows ATC or Admin to approve a flight with marginal or no-go feasibility.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Feasibility overridden and flight authorized",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = FlightVm.class))),
            @ApiResponse(responseCode = "400", description = "Flight already completed or cancelled", content = @Content),
            @ApiResponse(responseCode = "404", description = "Flight not found", content = @Content)
    })
    public ResponseEntity<FlightVm> overrideFeasibility(
            @Parameter(description = "Flight UUID identifier", required = true)
            @PathVariable String flightId,
            @Valid @RequestBody FeasibilityOverridePostVm request) {
        FlightVm result = feasibilityService.overrideFeasibility(flightId, request);
        return ResponseEntity.ok(result);
    }

    @GetMapping(value = "/flights/feasibility/history", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get feasibility evaluation history", description = "Retrieves paginated historical feasibility evaluation records filtered by flight or drone.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Feasibility evaluations retrieved",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = FeasibilityEvaluationListVm.class)))
    })
    public ResponseEntity<FeasibilityEvaluationListVm> getHistory(
            @Parameter(description = "Optional filter by Flight UUID")
            @RequestParam(required = false) String flightId,
            @Parameter(description = "Optional filter by Drone UUID")
            @RequestParam(required = false) String droneId,
            @Parameter(description = "Page size limit", example = "20")
            @RequestParam(defaultValue = "20") int limit,
            @Parameter(description = "Page offset", example = "0")
            @RequestParam(defaultValue = "0") int offset) {
        FeasibilityEvaluationListVm history = feasibilityService.getHistory(flightId, droneId, limit, offset);
        return ResponseEntity.ok(history);
    }

    @GetMapping(value = "/feasibility/history", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get feasibility evaluation history (alias)", description = "Alias route for retrieving historical feasibility evaluations.")
    public ResponseEntity<FeasibilityEvaluationListVm> getHistoryAlias(
            @RequestParam(required = false) String flightId,
            @RequestParam(required = false) String droneId,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return getHistory(flightId, droneId, limit, offset);
    }
}

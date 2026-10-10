package com.utm.hub.controller;

import com.utm.hub.model.enumeration.HubStatus;
import com.utm.hub.service.HubService;
import com.utm.hub.viewmodel.HubPostVm;
import com.utm.hub.viewmodel.HubPutVm;
import com.utm.hub.viewmodel.HubVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/hubs")
@RequiredArgsConstructor
@Tag(name = "Hubs Management", description = "Takeoff/Landing Vertiport and Hub Station Management")
public class HubController {

    private final HubService hubService;

    @GetMapping
    @Operation(
            summary = "List Hubs",
            description = "Retrieve a list of registered Takeoff/Landing Hubs / Vertiports filtered by search term and status."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Hubs retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            array = @ArraySchema(schema = @Schema(implementation = HubVm.class))
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content)
    })
    public ResponseEntity<List<HubVm>> getHubs(
            @Parameter(description = "Search term for hub name or callsign code")
            @RequestParam(required = false) String search,
            @Parameter(description = "Filter by operational status (active, inactive, maintenance)")
            @RequestParam(required = false) HubStatus status
    ) {
        return ResponseEntity.ok(hubService.getHubs(search, status));
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Get Hub by ID",
            description = "Retrieve complete technical profile, coordinates, available drones count, and corridors of a Hub."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Hub details retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = HubVm.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "404", description = "Hub not found with the specified ID", content = @Content)
    })
    public ResponseEntity<HubVm> getHubById(
            @Parameter(description = "Unique UUID of the Hub", example = "96683f5a-769f-44aa-b4d3-16c72f2fe0a4")
            @PathVariable String id
    ) {
        return ResponseEntity.ok(hubService.getHubById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('admin')")
    @Operation(
            summary = "Create a new Hub",
            description = "Register a new Takeoff/Landing Hub or Vertiport. Requires admin role."
    )
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Hub registration parameters",
            required = true,
            content = @Content(
                    mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = HubPostVm.class),
                    examples = @ExampleObject(
                            name = "HubSample",
                            value = """
                                    {
                                      "code": "HUB-SGN-D1",
                                      "name": "Trạm Trung Tâm Quận 1",
                                      "location": { "lat": 10.7769, "lng": 106.7009 },
                                      "altitudeMsl": 12.5,
                                      "airspaceRadius": 1500
                                    }
                                    """
                    )
            )
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Hub created successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = HubVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid request payload or validation error", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Admin role required", content = @Content),
            @ApiResponse(responseCode = "409", description = "Hub code already exists", content = @Content)
    })
    public ResponseEntity<HubVm> createHub(@Valid @RequestBody HubPostVm hubPostVm) {
        HubVm createdHub = hubService.createHub(hubPostVm);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdHub);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('admin', 'hub_operator')")
    @Operation(
            summary = "Update Hub information",
            description = "Update operational specifications or maintenance status of an existing Hub. Requires admin or hub_operator role."
    )
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Hub update parameters",
            required = true,
            content = @Content(
                    mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = HubPutVm.class),
                    examples = @ExampleObject(
                            name = "MaintenanceUpdate",
                            value = """
                                    {
                                      "name": "Trạm Trung Tâm Quận 1 - Bảo Trì",
                                      "altitudeMsl": 15.0,
                                      "airspaceRadius": 1800,
                                      "status": "maintenance"
                                    }
                                    """
                    )
            )
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Hub updated successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = HubVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid request parameters", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content),
            @ApiResponse(responseCode = "404", description = "Hub not found", content = @Content)
    })
    public ResponseEntity<HubVm> updateHub(
            @Parameter(description = "Unique UUID of the Hub", example = "96683f5a-769f-44aa-b4d3-16c72f2fe0a4")
            @PathVariable String id,
            @Valid @RequestBody HubPutVm hubPutVm
    ) {
        return ResponseEntity.ok(hubService.updateHub(id, hubPutVm));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(
            summary = "Deactivate Hub",
            description = "Deactivate a Hub by switching its status to inactive. Requires admin role."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Hub deactivated successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            examples = @ExampleObject(value = "{\"message\": \"Hub deactivated successfully\"}")
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Admin role required", content = @Content),
            @ApiResponse(responseCode = "404", description = "Hub not found", content = @Content)
    })
    public ResponseEntity<Map<String, String>> deleteHub(
            @Parameter(description = "Unique UUID of the Hub", example = "96683f5a-769f-44aa-b4d3-16c72f2fe0a4")
            @PathVariable String id
    ) {
        hubService.deactivateHub(id);
        return ResponseEntity.ok(Map.of("message", "Hub deactivated successfully"));
    }
}

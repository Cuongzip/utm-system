package com.utm.hub.controller;

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
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/hubs")
@RequiredArgsConstructor
@Tag(name = "Hubs / Vertiports Management", description = "Management of Takeoff/Landing Hubs, Vertiports, WGS84 coordinates, and ground charging capacity")
public class HubController {

    private final HubService hubService;

    @GetMapping
    @Operation(
            summary = "List all Hubs",
            description = "Retrieve a list of all registered Takeoff/Landing Hubs / Vertiports across the DROPS-UTM system."
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
    public ResponseEntity<List<HubVm>> getAllHubs() {
        return ResponseEntity.ok(hubService.getAllHubs());
    }

    @PostMapping
    @PreAuthorize("hasRole('admin')")
    @Operation(
            summary = "Create a new Hub",
            description = "Register a new Takeoff/Landing Hub, Vertiport, or Ground Control Station. Requires admin role."
    )
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Hub registration parameters",
            required = true,
            content = @Content(
                    mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = HubPostVm.class),
                    examples = @ExampleObject(
                            name = "Athens Vertiport Alpha",
                            value = """
                                    {
                                      "name": "Athens Central Vertiport Alpha",
                                      "code": "HUB-ATH-01",
                                      "latitude": 37.983810,
                                      "longitude": 23.727539,
                                      "altitude": 120.5,
                                      "capacity": 10,
                                      "chargingPads": 4
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

    @GetMapping("/{id}")
    @Operation(
            summary = "Get Hub by ID",
            description = "Retrieve complete technical profile, coordinates, and parking capacity of a Hub."
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
            @Parameter(description = "Unique UUID of the Hub", example = "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
            @PathVariable String id) {
        return ResponseEntity.ok(hubService.getHubById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('admin', 'hub_operator')")
    @Operation(
            summary = "Update Hub information",
            description = "Update operational specifications, capacity, or maintenance status of an existing Hub. Requires admin or hub_operator role."
    )
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Hub update parameters",
            required = true,
            content = @Content(
                    mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = HubPutVm.class),
                    examples = @ExampleObject(
                            name = "Update Status to Maintenance",
                            value = """
                                    {
                                      "name": "Athens Central Vertiport Alpha - Maintenance",
                                      "capacity": 8,
                                      "status": "maintenance",
                                      "chargingPads": 3
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
            @Parameter(description = "Unique UUID of the Hub", example = "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
            @PathVariable String id,
            @Valid @RequestBody HubPutVm hubPutVm) {
        return ResponseEntity.ok(hubService.updateHub(id, hubPutVm));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(
            summary = "Deactivate / Close a Hub",
            description = "Deactivate a Hub, changing its status to closed. Requires admin role."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Hub deactivated successfully", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Admin role required", content = @Content),
            @ApiResponse(responseCode = "404", description = "Hub not found", content = @Content)
    })
    public ResponseEntity<Void> deleteHub(
            @Parameter(description = "Unique UUID of the Hub", example = "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
            @PathVariable String id) {
        hubService.deactivateHub(id);
        return ResponseEntity.ok().build();
    }
}

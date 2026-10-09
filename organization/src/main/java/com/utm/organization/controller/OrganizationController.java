package com.utm.organization.controller;

import com.utm.organization.model.enumeration.OrganizationStatus;
import com.utm.organization.model.enumeration.OrganizationType;
import com.utm.organization.service.OrganizationService;
import com.utm.organization.viewmodel.OrganizationListGetVm;
import com.utm.organization.viewmodel.OrganizationPostVm;
import com.utm.organization.viewmodel.OrganizationPutVm;
import com.utm.organization.viewmodel.OrganizationVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
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

@RestController
@RequestMapping("/api/v1/organizations")
@RequiredArgsConstructor
@Tag(name = "Organizations Management", description = "Management of Multi-tenant Organizations (Operators, Authorities, Enterprises)")
public class OrganizationController {

    private final OrganizationService organizationService;

    @GetMapping
    @Operation(
            summary = "List organizations",
            description = "Retrieve a paginated and filtered list of registered organizations in the DROPS-UTM system."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Organizations retrieved successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = OrganizationListGetVm.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content)
    })
    public ResponseEntity<OrganizationListGetVm> getOrganizations(
            @Parameter(description = "Search term for company name or registration number")
            @RequestParam(required = false) String search,
            @Parameter(description = "Filter by organization type (operator, authority, enterprise)")
            @RequestParam(required = false) OrganizationType type,
            @Parameter(description = "Filter by status (active, suspended, inactive)")
            @RequestParam(required = false) OrganizationStatus status,
            @Parameter(description = "Page size limit (default: 20)")
            @RequestParam(defaultValue = "20") int limit,
            @Parameter(description = "Offset index (default: 0)")
            @RequestParam(defaultValue = "0") int offset
    ) {
        return ResponseEntity.ok(organizationService.getOrganizations(search, type, status, limit, offset));
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Get Organization by ID",
            description = "Retrieve detailed information of a specific organization by its UUID."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Organization details found",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = OrganizationVm.class)
                    )
            ),
            @ApiResponse(responseCode = "404", description = "Organization not found", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - JWT authentication required", content = @Content)
    })
    public ResponseEntity<OrganizationVm> getOrganizationById(
            @Parameter(description = "Organization UUID", required = true)
            @PathVariable String id
    ) {
        return ResponseEntity.ok(organizationService.getOrganizationById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('admin')")
    @Operation(
            summary = "Register new Organization",
            description = "Register a new enterprise, operator, or authority organization in the system. Requires admin role."
    )
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Organization registration details",
            required = true,
            content = @Content(
                    mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = OrganizationPostVm.class),
                    examples = @ExampleObject(
                            name = "DroneExpressSample",
                            value = """
                                    {
                                      "name": "Drone Express Vietnam JSC",
                                      "type": "operator",
                                      "registrationNumber": "VN-BIZ-0109988776",
                                      "contactInfo": "contact@droneexpress.vn | +84-28-3822-9999"
                                    }
                                    """
                    )
            )
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "Organization registered successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = OrganizationVm.class)
                    )
            ),
            @ApiResponse(responseCode = "400", description = "Bad request - invalid fields", content = @Content),
            @ApiResponse(responseCode = "409", description = "Conflict - registration number already exists", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - requires admin role", content = @Content)
    })
    public ResponseEntity<OrganizationVm> createOrganization(@Valid @RequestBody OrganizationPostVm organizationPostVm) {
        OrganizationVm created = organizationService.createOrganization(organizationPostVm);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('admin', 'operator')")
    @Operation(
            summary = "Update Organization",
            description = "Update information and operational status of an existing organization."
    )
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Organization update details",
            required = true,
            content = @Content(
                    mediaType = MediaType.APPLICATION_JSON_VALUE,
                    schema = @Schema(implementation = OrganizationPutVm.class),
                    examples = @ExampleObject(
                            name = "OrganizationUpdateSample",
                            value = """
                                    {
                                      "name": "Drone Express Global JSC",
                                      "type": "operator",
                                      "contactInfo": "support@droneexpress.vn | +84-28-3822-0000",
                                      "status": "active"
                                    }
                                    """
                    )
            )
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Organization updated successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = OrganizationVm.class)
                    )
            ),
            @ApiResponse(responseCode = "404", description = "Organization not found", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden", content = @Content)
    })
    public ResponseEntity<OrganizationVm> updateOrganization(
            @Parameter(description = "Organization UUID", required = true)
            @PathVariable String id,
            @Valid @RequestBody OrganizationPutVm organizationPutVm
    ) {
        return ResponseEntity.ok(organizationService.updateOrganization(id, organizationPutVm));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(
            summary = "Soft-delete Organization",
            description = "Soft-delete an organization by switching its status to inactive. Requires admin role."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Organization soft-deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Organization not found", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - requires admin role", content = @Content)
    })
    public ResponseEntity<Void> deleteOrganization(
            @Parameter(description = "Organization UUID", required = true)
            @PathVariable String id
    ) {
        organizationService.deleteOrganization(id);
        return ResponseEntity.noContent().build();
    }
}

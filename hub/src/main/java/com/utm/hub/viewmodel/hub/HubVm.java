package com.utm.hub.viewmodel.hub;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.utm.hub.model.enumeration.HubStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;
import java.util.Map;

@Schema(description = "Detailed profile and specifications of a Takeoff/Landing Hub or Vertiport")
@JsonInclude(JsonInclude.Include.NON_NULL)
public record HubVm(
        String id,
        String code,
        String name,
        String organizationId,
        LocationVm location,
        Double altitudeMsl,
        Double airspaceRadius,
        Integer maxSimultaneousDrones,
        Double airspaceFloor,
        Double airspaceCeiling,
        String timezone,
        Map<String, Object> capabilities,
        Map<String, Object> contactInfo,
        HubStatus status,
        ZonedDateTime createdOn,
        String createdBy,
        ZonedDateTime lastModifiedOn,
        String lastModifiedBy
) {
    public HubVm(
            String id,
            String code,
            String name,
            LocationVm location,
            Double altitudeMsl,
            Double airspaceRadius,
            Integer maxSimultaneousDrones,
            Double airspaceFloor,
            Double airspaceCeiling,
            HubStatus status,
            ZonedDateTime createdOn,
            String createdBy,
            ZonedDateTime lastModifiedOn,
            String lastModifiedBy
    ) {
        this(id, code, name, null, location, altitudeMsl, airspaceRadius, maxSimultaneousDrones,
                airspaceFloor, airspaceCeiling, "Asia/Ho_Chi_Minh", null, null,
                status, createdOn, createdBy, lastModifiedOn, lastModifiedBy);
    }

    public HubVm(
            String id,
            String code,
            String name,
            LocationVm location,
            Double altitudeMsl,
            Double airspaceRadius,
            Integer maxSimultaneousDrones,
            Double airspaceFloor,
            Double airspaceCeiling,
            HubStatus status,
            ZonedDateTime createdOn,
            ZonedDateTime lastModifiedOn
    ) {
        this(id, code, name, location, altitudeMsl, airspaceRadius, maxSimultaneousDrones,
                airspaceFloor, airspaceCeiling, status, createdOn, null, lastModifiedOn, null);
    }

    public HubVm(
            String id,
            String code,
            String name,
            LocationVm location,
            Double altitudeMsl,
            Double airspaceRadius,
            HubStatus status,
            ZonedDateTime createdOn,
            ZonedDateTime lastModifiedOn
    ) {
        this(id, code, name, location, altitudeMsl, airspaceRadius, 10, 0.0, 120.0, status,
                createdOn, null, lastModifiedOn, null);
    }
}

package com.utm.hub.viewmodel.hub;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.utm.hub.model.enumeration.HubStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import java.util.Map;

@Schema(description = "Request payload for updating an existing Hub / Vertiport")
public record HubPutVm(
        String name,
        String organizationId,
        @Valid LocationVm location,
        @PositiveOrZero(message = "Altitude MSL must be >= 0") Double altitudeMsl,
        @Positive(message = "Airspace radius must be positive") Double airspaceRadius,
        HubStatus status,
        @Positive(message = "Max simultaneous drones must be positive") Integer maxSimultaneousDrones,
        @PositiveOrZero(message = "Airspace floor must be >= 0") Double airspaceFloor,
        @Positive(message = "Airspace ceiling must be positive") Double airspaceCeiling,
        String timezone,
        Map<String, Object> capabilities,
        Map<String, Object> contactInfo) {

    public HubPutVm(
            String name,
            LocationVm location,
            Double altitudeMsl,
            Double airspaceRadius,
            HubStatus status) {
        this(name, null, location, altitudeMsl, airspaceRadius, status, null, null, null, null, null, null);
    }

    public HubPutVm(
            String name,
            LocationVm location,
            Double altitudeMsl,
            Double airspaceRadius,
            HubStatus status,
            Integer maxSimultaneousDrones,
            Double airspaceFloor,
            Double airspaceCeiling) {
        this(name, null, location, altitudeMsl, airspaceRadius, status, maxSimultaneousDrones, airspaceFloor, airspaceCeiling, null, null, null);
    }

    @JsonIgnore
    @Schema(hidden = true)
    @AssertTrue(message = "Airspace ceiling must be greater than airspace floor")
    public boolean isAirspaceBoundsValid() {
        if (airspaceFloor != null && airspaceCeiling != null) {
            return airspaceCeiling > airspaceFloor;
        }
        return true;
    }
}

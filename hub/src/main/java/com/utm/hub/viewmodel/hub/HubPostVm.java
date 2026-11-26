package com.utm.hub.viewmodel.hub;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.util.Map;

@Schema(description = "Request payload for registering a new Hub / Vertiport")
public record HubPostVm(
        @Size(min = 3, max = 50, message = "Code must be between 3 and 50 characters")
        @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Code must contain only alphanumeric characters, dashes, and underscores")
        String code,

        @NotBlank(message = "Hub name is required")
        String name,

        String organizationId,

        @NotNull(message = "Location is required")
        @Valid
        LocationVm location,

        @NotNull(message = "Altitude MSL is required")
        @PositiveOrZero(message = "Altitude MSL must be >= 0")
        Double altitudeMsl,

        @NotNull(message = "Airspace radius is required")
        @Positive(message = "Airspace radius must be positive")
        Double airspaceRadius,

        @Positive(message = "Max simultaneous drones must be positive")
        Integer maxSimultaneousDrones,

        @PositiveOrZero(message = "Airspace floor must be >= 0")
        Double airspaceFloor,

        @Positive(message = "Airspace ceiling must be positive")
        Double airspaceCeiling,

        String timezone,
        Map<String, Object> capabilities,
        Map<String, Object> contactInfo) {

    public HubPostVm(
            String code,
            String name,
            LocationVm location,
            Double altitudeMsl,
            Double airspaceRadius) {
        this(code, name, null, location, altitudeMsl, airspaceRadius, null, null, null, null, null, null);
    }

    public HubPostVm(
            String code,
            String name,
            LocationVm location,
            Double altitudeMsl,
            Double airspaceRadius,
            Integer maxSimultaneousDrones,
            Double airspaceFloor,
            Double airspaceCeiling) {
        this(code, name, null, location, altitudeMsl, airspaceRadius, maxSimultaneousDrones, airspaceFloor, airspaceCeiling, null, null, null);
    }

    @JsonIgnore
    @Schema(hidden = true)
    @AssertTrue(message = "Airspace ceiling must be greater than airspace floor")
    public boolean isAirspaceBoundsValid() {
        double effectiveFloor = airspaceFloor != null ? airspaceFloor : 0.0;
        double effectiveCeiling = airspaceCeiling != null ? airspaceCeiling : 120.0;
        return effectiveCeiling > effectiveFloor;
    }
}

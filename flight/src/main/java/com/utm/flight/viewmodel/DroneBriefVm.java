package com.utm.flight.viewmodel;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;

@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "Brief profile of Drone retrieved from Drone service")
public record DroneBriefVm(
        @Schema(description = "Unique UUID identifier of the drone")
        String id,

        @Schema(description = "Aircraft registration number / callsign")
        String registrationNumber,

        @Schema(description = "Current operational status (available, in_flight, etc.)")
        String status
) {
}

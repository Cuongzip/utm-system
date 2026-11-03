package com.utm.flight.viewmodel.client;

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
        String status,

        @Schema(description = "Rated battery capacity in Watt-hours (Wh)")
        Double batteryCapacityWh,

        @Schema(description = "Maximum payload capacity in kilograms (kg)")
        Double maxPayload,

        @Schema(description = "Hover power consumption in Watts (W)")
        Double hoverPowerW,

        @Schema(description = "Cruise power consumption in Watts (W)")
        Double cruisePowerW,

        @Schema(description = "Nominal cruise speed in m/s")
        Double cruiseSpeedMs,

        @Schema(description = "Current battery health percentage (%)")
        Double batteryHealthPct,

        @Schema(description = "Maximum wind resistance tolerance in m/s")
        Double windToleranceMs,

        @Schema(description = "Maximum flight duration in minutes")
        Double maxFlightTimeMin
) {
}


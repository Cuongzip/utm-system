package com.utm.flight.viewmodel.feasibility;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;

@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "Drone technical energy specification parameters")
public record DroneEnergySpecVm(
        Double batteryCapacityWh,
        Double hoverPowerW,
        Double cruisePowerW,
        Double cruiseSpeedMs,
        Double batteryHealthPct,
        Double windToleranceMs,
        Double maxPayloadKg,
        Double maxFlightTimeMin
) {
}


package com.utm.simulation.viewmodel.session;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.utm.simulation.viewmodel.client.WaypointVm;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "Payload to launch a virtual flight simulation session from a flight, mission, or manual waypoints")
public record SimulationSessionCreateVm(
        @Schema(description = "Associated flight plan UUID identifier")
        String flightId,

        @Schema(description = "Simulated cruising speed in m/s (default 15.0)", defaultValue = "15.0")
        Double speed,

        @Schema(description = "Time-scale acceleration factor between 0.1 and 20.0 (default 1.0)", defaultValue = "1.0")
        @DecimalMin(value = "0.1", message = "Time scale must be at least 0.1x")
        @DecimalMax(value = "20.0", message = "Time scale cannot exceed 20.0x")
        Double timeScale,

        @Schema(description = "Initial battery percentage at takeoff (0 - 100%)", defaultValue = "100.0")
        Double startBattery,

        @Schema(description = "Optional Mission UUID when simulating a mission directly without a created flight")
        String missionId,

        @Schema(description = "Optional Drone UUID when simulating from mission or manual waypoints")
        String droneId,

        @Schema(description = "Optional manual waypoints list ([lat, lon, alt])")
        List<WaypointVm> waypoints,

        @Schema(description = "Telemetry tick frequency in Hz (default 1.0)")
        Double tickRate
) {
    public SimulationSessionCreateVm(String flightId, Double speed, Double timeScale, Double startBattery) {
        this(flightId, speed, timeScale, startBattery, null, null, null, 1.0);
    }

    public String flightId() {
        return (flightId != null) ? flightId.trim() : null;
    }

    public String missionId() {
        return (missionId != null) ? missionId.trim() : null;
    }

    public String droneId() {
        return (droneId != null) ? droneId.trim() : null;
    }

    public Double speed() {
        if (speed != null && speed > 0) {
            return speed;
        }
        return 15.0;
    }

    public Double timeScale() {
        if (timeScale != null && timeScale >= 0.1 && timeScale <= 20.0) {
            return timeScale;
        }
        return 1.0;
    }

    public Double startBattery() {
        if (startBattery != null && startBattery >= 0.0 && startBattery <= 100.0) {
            return startBattery;
        }
        return 100.0;
    }

    public Double tickRate() {
        if (tickRate != null && tickRate >= 0.2 && tickRate <= 10.0) {
            return tickRate;
        }
        return 1.0;
    }
}

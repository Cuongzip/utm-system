package com.utm.simulation.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.util.List;

@Schema(
        description = "Payload to launch a new virtual flight simulation session",
        example = """
        {
          "droneId": "drone-sim-01",
          "missionId": "mission-01",
          "departureHubId": "hub-01",
          "arrivalHubId": "hub-02",
          "speed": 15.0,
          "timeScale": 1.0,
          "startBattery": 100.0,
          "waypoints": [
            { "lat": 10.7769, "lon": 106.7009, "alt": 50.0 },
            { "lat": 10.7820, "lon": 106.7050, "alt": 80.0 },
            { "lat": 10.7890, "lon": 106.7120, "alt": 60.0 }
          ]
        }
        """
)
public record SimulationSessionCreateVm(
        @Schema(description = "ID of the drone participating in simulation", example = "drone-sim-01")
        @NotNull(message = "Drone ID is required")
        String droneId,

        @Schema(description = "Associated flight mission ID", example = "mission-01")
        String missionId,

        @Schema(description = "Departure vertiport / hub ID", example = "hub-01")
        @NotNull(message = "Departure hub ID is required")
        String departureHubId,

        @Schema(description = "Arrival vertiport / hub ID", example = "hub-02")
        String arrivalHubId,

        @Schema(description = "Simulated cruising speed in m/s (default 15.0)", example = "15.0", defaultValue = "15.0")
        Double speed,

        @Schema(description = "Time-scale acceleration factor between 0.1 and 20.0 (default 1.0)", example = "1.0", defaultValue = "1.0")
        @DecimalMin(value = "0.1", message = "Time scale must be at least 0.1x")
        @DecimalMax(value = "20.0", message = "Time scale cannot exceed 20.0x")
        Double timeScale,

        @Schema(description = "Initial battery percentage at takeoff (0 - 100%)", example = "100.0", defaultValue = "100.0")
        Double startBattery,

        @Schema(description = "Optional custom list of 3D trajectory waypoints. If omitted, will be derived from departure and arrival hubs")
        List<@Valid WaypointVm> waypoints
) {
    public Double speed() {
        return (speed != null && speed > 0) ? speed : 15.0;
    }

    public Double timeScale() {
        return (timeScale != null && timeScale >= 0.1 && timeScale <= 20.0) ? timeScale : 1.0;
    }

    public Double startBattery() {
        return (startBattery != null && startBattery > 0 && startBattery <= 100.0) ? startBattery : 100.0;
    }
}

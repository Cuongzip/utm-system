package com.utm.simulation.viewmodel;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "Payload to launch a new virtual flight simulation session for an existing flight plan", example = """
        {
          "flightId": "550e8400-e29b-41d4-a716-446655440000",
          "speed": 15.0,
          "timeScale": 1.0,
          "startBattery": 100.0
        }
        """)
public record SimulationSessionCreateVm(
        @Schema(description = "Associated flight plan UUID identifier", example = "550e8400-e29b-41d4-a716-446655440000")
        @NotNull(message = "Flight ID is required")
        String flightId,

        @Schema(description = "Simulated cruising speed in m/s (default 15.0)", example = "15.0", defaultValue = "15.0")
        Double speed,

        @Schema(description = "Time-scale acceleration factor between 0.1 and 20.0 (default 1.0)", example = "1.0", defaultValue = "1.0")
        @DecimalMin(value = "0.1", message = "Time scale must be at least 0.1x")
        @DecimalMax(value = "20.0", message = "Time scale cannot exceed 20.0x")
        Double timeScale,

        @Schema(description = "Initial battery percentage at takeoff (0 - 100%)", example = "100.0", defaultValue = "100.0")
        Double startBattery) {

    public String flightId() {
        return (flightId != null) ? flightId.trim() : null;
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
}

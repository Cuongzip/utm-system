package com.utm.flight.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.ZonedDateTime;
import java.util.List;

@Schema(
        description = "Request payload for registering a new Flight Plan",
        example = """
        {
          "flightNumber": "FL-2026-001",
          "droneId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
          "departureHubId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          "arrivalHubId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
          "pilotId": "PILOT-VN-007",
          "scheduledDeparture": "2026-10-01T08:00:00Z",
          "scheduledArrival": "2026-10-01T08:45:00Z",
          "cruisingAltitudeM": 120.0,
          "notes": "Medical parcel delivery route via Corridor Bravo",
          "waypoints": [
            { "lat": 10.7769, "lon": 106.7009, "alt": 0.0, "speed": 0.0 },
            { "lat": 10.7820, "lon": 106.7050, "alt": 80.0, "speed": 12.0 },
            { "lat": 10.7850, "lon": 106.7080, "alt": 100.0, "speed": 15.0 },
            { "lat": 10.7890, "lon": 106.7120, "alt": 0.0, "speed": 0.0 }
          ]
        }
        """
)
public record FlightPostVm(
        @Schema(description = "Unique flight number / callsign", example = "FL-2026-001")
        @NotBlank(message = "Flight number cannot be blank")
        String flightNumber,

        @Schema(description = "Assigned Drone UUID identifier", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
        @NotBlank(message = "Drone ID cannot be blank")
        String droneId,

        @Schema(description = "Departure Hub / Vertiport UUID identifier", example = "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
        @NotBlank(message = "Departure Hub ID cannot be blank")
        String departureHubId,

        @Schema(description = "Arrival Hub / Vertiport UUID identifier", example = "b2c3d4e5-f6a7-8901-bcde-f12345678901")
        @NotBlank(message = "Arrival Hub ID cannot be blank")
        String arrivalHubId,

        @Schema(description = "Remote Pilot ID / License number", example = "PILOT-VN-007")
        String pilotId,

        @Schema(description = "Scheduled departure timestamp", example = "2026-10-01T08:00:00Z")
        @NotNull(message = "Scheduled departure time is required")
        ZonedDateTime scheduledDeparture,

        @Schema(description = "Scheduled arrival timestamp", example = "2026-10-01T08:45:00Z")
        @NotNull(message = "Scheduled arrival time is required")
        ZonedDateTime scheduledArrival,

        @Schema(description = "Planned cruising altitude in meters (m)", example = "120.0")
        Double cruisingAltitudeM,

        @Schema(description = "Flight remarks, route notes or weather considerations", example = "Medical parcel delivery route via Corridor Bravo")
        String notes,

        @Schema(description = "Ordered list of 3D trajectory waypoints along the planned route")
        List<@Valid WaypointVm> waypoints
) {
}

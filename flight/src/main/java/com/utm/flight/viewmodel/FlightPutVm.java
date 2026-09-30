package com.utm.flight.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.ZonedDateTime;

@Schema(description = "Request payload for updating an existing Flight Plan before departure")
public record FlightPutVm(
        @Schema(description = "Updated Drone UUID identifier", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
        String droneId,

        @Schema(description = "Updated Departure Hub UUID identifier", example = "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
        String departureHubId,

        @Schema(description = "Updated Arrival Hub UUID identifier", example = "b2c3d4e5-f6a7-8901-bcde-f12345678901")
        String arrivalHubId,

        @Schema(description = "Updated Remote Pilot ID", example = "PILOT-VN-008")
        String pilotId,

        @Schema(description = "Updated scheduled departure timestamp", example = "2026-10-01T08:30:00Z")
        ZonedDateTime scheduledDeparture,

        @Schema(description = "Updated scheduled arrival timestamp", example = "2026-10-01T09:15:00Z")
        ZonedDateTime scheduledArrival,

        @Schema(description = "Updated cruising altitude in meters (m)", example = "150.0")
        Double cruisingAltitudeM,

        @Schema(description = "Updated flight remarks or weather considerations", example = "Adjusted route due to wind speed")
        String notes
) {
}

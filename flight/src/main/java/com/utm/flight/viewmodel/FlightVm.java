package com.utm.flight.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.ZonedDateTime;

@Schema(description = "Detailed profile and telemetry status of a Flight Plan / Operation")
public record FlightVm(
        @Schema(description = "Unique UUID identifier of the flight", example = "550e8400-e29b-41d4-a716-446655440000")
        String id,

        @Schema(description = "Unique flight number / callsign", example = "FL-2026-001")
        String flightNumber,

        @Schema(description = "Assigned Drone UUID identifier", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
        String droneId,

        @Schema(description = "Departure Hub / Vertiport UUID identifier", example = "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
        String departureHubId,

        @Schema(description = "Arrival Hub / Vertiport UUID identifier", example = "b2c3d4e5-f6a7-8901-bcde-f12345678901")
        String arrivalHubId,

        @Schema(description = "Remote Pilot ID / License number", example = "PILOT-VN-007")
        String pilotId,

        @Schema(description = "Scheduled departure timestamp", example = "2026-10-01T08:00:00Z")
        ZonedDateTime scheduledDeparture,

        @Schema(description = "Scheduled arrival timestamp", example = "2026-10-01T08:45:00Z")
        ZonedDateTime scheduledArrival,

        @Schema(description = "Actual departure timestamp", example = "2026-10-01T08:02:15Z")
        ZonedDateTime actualDeparture,

        @Schema(description = "Actual arrival timestamp", example = "2026-10-01T08:43:50Z")
        ZonedDateTime actualArrival,

        @Schema(description = "Planned cruising altitude in meters (m)", example = "120.0")
        Double cruisingAltitudeM,

        @Schema(description = "Current flight status (planned, authorized, active, completed, aborted)", example = "planned")
        String status,

        @Schema(description = "Flight remarks, route notes or weather considerations", example = "Medical parcel delivery route via Corridor Bravo")
        String notes,

        @Schema(description = "Record creation timestamp", example = "2026-09-30T10:00:00Z")
        ZonedDateTime createdOn,

        @Schema(description = "Username who created this flight plan", example = "admin")
        String createdBy,

        @Schema(description = "Last modification timestamp", example = "2026-09-30T10:30:00Z")
        ZonedDateTime lastModifiedOn,

        @Schema(description = "Username who last updated this flight plan", example = "admin")
        String lastModifiedBy
) {
}

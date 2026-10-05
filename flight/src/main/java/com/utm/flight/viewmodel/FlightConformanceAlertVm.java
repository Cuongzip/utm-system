package com.utm.flight.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.ZonedDateTime;

@Schema(description = "Conformance violation alert event")
public record FlightConformanceAlertVm(
        @Schema(description = "Alert unique UUID identifier")
        String id,

        @Schema(description = "Associated flight plan UUID identifier")
        String flightId,

        @Schema(description = "Type of deviation alert: LATERAL_DEVIATION, ALTITUDE_DEVIATION, C2_LINK_LOST, CONTINGENCY_TRIGGERED, RECOVERY_CONFORMANT")
        String alertType,

        @Schema(description = "Severity level: LOW, MEDIUM, HIGH, CRITICAL")
        String severity,

        @Schema(description = "Human-readable diagnostic description of the incident")
        String message,

        @Schema(description = "Detailed JSON payload regarding the breach")
        String detailsJson,

        @Schema(description = "Whether the alert has been acknowledged by an operator")
        Boolean acknowledged,

        @Schema(description = "Timestamp when the alert was triggered")
        ZonedDateTime createdOn,

        @Schema(description = "Operator or system that created the alert")
        String createdBy
) {}

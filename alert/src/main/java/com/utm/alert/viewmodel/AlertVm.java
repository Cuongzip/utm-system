package com.utm.alert.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.ZonedDateTime;

@Schema(description = "Operational alert event model")
public record AlertVm(
        @Schema(description = "Unique alert UUID identifier")
        String id,

        @Schema(description = "Alert type code")
        String alertType,

        @Schema(description = "Severity level: LOW, MEDIUM, HIGH, CRITICAL")
        String severity,

        @Schema(description = "Lifecycle status: ACTIVE, ACKNOWLEDGED, RESOLVED, DISMISSED")
        String status,

        @Schema(description = "Associated drone UUID")
        String droneId,

        @Schema(description = "Associated flight UUID")
        String flightId,

        @Schema(description = "Associated hub UUID")
        String hubId,

        @Schema(description = "Diagnostic human-readable message")
        String message,

        @Schema(description = "Detailed JSON payload")
        String detailsJson,

        @Schema(description = "Whether the alert has been acknowledged by an operator")
        Boolean acknowledged,

        @Schema(description = "Timestamp when the alert was acknowledged")
        ZonedDateTime acknowledgedAt,

        @Schema(description = "Operator or username who acknowledged the alert")
        String acknowledgedBy,

        @Schema(description = "Whether the alert has been marked as resolved")
        Boolean resolved,

        @Schema(description = "Timestamp when the alert was resolved")
        ZonedDateTime resolvedAt,

        @Schema(description = "Operator or system who marked the alert as resolved")
        String resolvedBy,

        @Schema(description = "Resolution commentary or remediation actions")
        String resolutionNotes,

        @Schema(description = "Creation timestamp")
        ZonedDateTime createdOn,

        @Schema(description = "Creator username or system agent")
        String createdBy,

        @Schema(description = "Last update timestamp")
        ZonedDateTime lastModifiedOn,

        @Schema(description = "Last update username")
        String lastModifiedBy
) {}

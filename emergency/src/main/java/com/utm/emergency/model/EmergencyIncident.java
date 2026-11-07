package com.utm.emergency.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
import com.utm.emergency.model.enumeration.IncidentStatus;
import com.utm.emergency.model.enumeration.ResponseAction;
import com.utm.emergency.model.enumeration.RootCause;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.ZonedDateTime;

@Entity
@Table(name = "emergency_incidents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmergencyIncident extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "incident_number", length = 50, unique = true)
    private String incidentNumber;

    @Column(name = "drone_id", length = 36, nullable = false)
    private String droneId;

    @Column(name = "flight_id", length = 36)
    private String flightId;

    @Enumerated(EnumType.STRING)
    @Column(name = "emergency_type", length = 50, nullable = false)
    private EmergencyType emergencyType;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", length = 50, nullable = false)
    private EmergencySeverity severity;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50, nullable = false)
    @Builder.Default
    private IncidentStatus status = IncidentStatus.active;

    @Column(name = "message", columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(name = "detection_data", columnDefinition = "TEXT")
    private String detectionData;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "altitude")
    private Double altitude;

    @Enumerated(EnumType.STRING)
    @Column(name = "response_action", length = 50)
    private ResponseAction responseAction;

    @Column(name = "was_auto_executed", nullable = false)
    @Builder.Default
    private boolean wasAutoExecuted = false;

    @Column(name = "confirmation_required", nullable = false)
    @Builder.Default
    private boolean confirmationRequired = false;

    @Column(name = "confirmed_by", length = 100)
    private String confirmedBy;

    @Column(name = "confirmed_at")
    private ZonedDateTime confirmedAt;

    @Column(name = "confirmation_timeout_at")
    private ZonedDateTime confirmationTimeoutAt;

    @Column(name = "action_started_at")
    private ZonedDateTime actionStartedAt;

    @Column(name = "action_completed_at")
    private ZonedDateTime actionCompletedAt;

    @Column(name = "action_success")
    private Boolean actionSuccess;

    @Column(name = "action_error", columnDefinition = "TEXT")
    private String actionError;

    @Column(name = "resolved_at")
    private ZonedDateTime resolvedAt;

    @Column(name = "resolved_by", length = 100)
    private String resolvedBy;

    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;

    @Enumerated(EnumType.STRING)
    @Column(name = "root_cause", length = 50)
    private RootCause rootCause;

    @Column(name = "root_cause_notes", columnDefinition = "TEXT")
    private String rootCauseNotes;

    @Column(name = "lessons_learned", columnDefinition = "TEXT")
    private String lessonsLearned;

    @Column(name = "timeline", columnDefinition = "TEXT")
    private String timeline;

    @Column(name = "detected_at", nullable = false)
    private ZonedDateTime detectedAt;
}
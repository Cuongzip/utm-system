package com.utm.alert.model;

import com.utm.alert.model.enumeration.AlertSeverity;
import com.utm.alert.model.enumeration.AlertStatus;
import com.utm.alert.model.enumeration.AlertType;
import com.utm.commonlibrary.model.AbstractAuditEntity;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.ZonedDateTime;
import java.util.Map;

@Entity
@Table(name = "alert")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Alert extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(name = "alert_type", length = 50, nullable = false)
    @Builder.Default
    private AlertType alertType = AlertType.OTHER;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", length = 20, nullable = false)
    @Builder.Default
    private AlertSeverity severity = AlertSeverity.HIGH;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30, nullable = false)
    @Builder.Default
    private AlertStatus status = AlertStatus.ACTIVE;

    @Column(name = "drone_id", length = 36)
    private String droneId;

    @Column(name = "flight_id", length = 36)
    private String flightId;

    @Column(name = "hub_id", length = 36)
    private String hubId;

    @Column(name = "conflict_id", length = 36)
    private String conflictId;

    @Column(name = "incident_id", length = 36)
    private String incidentId;

    @Column(name = "message", columnDefinition = "TEXT", nullable = false)
    private String message;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "details_json", columnDefinition = "jsonb")
    private Map<String, Object> detailsJson;

    @Column(name = "acknowledged_at")
    private ZonedDateTime acknowledgedAt;

    @Column(name = "acknowledged_by", length = 100)
    private String acknowledgedBy;

    @Column(name = "resolved_at")
    private ZonedDateTime resolvedAt;

    @Column(name = "resolved_by", length = 100)
    private String resolvedBy;

    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;
}

package com.utm.drone.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.drone.model.enumeration.CommandStatus;
import com.utm.drone.model.enumeration.CommandType;
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

import java.time.Instant;

@Entity
@Table(name = "drone_command")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DroneCommand extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "drone_id", length = 36, nullable = false)
    private String droneId;

    @Column(name = "flight_id", length = 36)
    private String flightId;

    @Enumerated(EnumType.STRING)
    @Column(name = "command_type", length = 50, nullable = false)
    private CommandType commandType;

    @Column(name = "parameters", columnDefinition = "TEXT")
    private String parameters;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50, nullable = false)
    @Builder.Default
    private CommandStatus status = CommandStatus.PENDING;

    @Column(name = "issued_by", length = 100, nullable = false)
    private String issuedBy;

    @Column(name = "issued_at", nullable = false)
    @Builder.Default
    private Instant issuedAt = Instant.now();

    @Column(name = "acknowledged_at")
    private Instant acknowledgedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "priority", nullable = false)
    @Builder.Default
    private Integer priority = 2;

    @Column(name = "timeout_ms", nullable = false)
    @Builder.Default
    private Integer timeoutMs = 2000;

    @Column(name = "retry_count", nullable = false)
    @Builder.Default
    private Integer retryCount = 0;

    @Column(name = "max_retries", nullable = false)
    @Builder.Default
    private Integer maxRetries = 2;
}

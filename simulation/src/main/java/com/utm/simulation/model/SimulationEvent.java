package com.utm.simulation.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.ZonedDateTime;

@Entity
@Table(name = "simulation_event")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimulationEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "session_id", length = 36, nullable = false)
    private String sessionId;

    @Column(name = "event_type", length = 50, nullable = false)
    private String eventType;

    @Column(name = "scenario", length = 50)
    private String scenario;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @Column(name = "severity", length = 20)
    private String severity;

    @Column(name = "config_json", columnDefinition = "TEXT")
    private String configJson;

    @CreationTimestamp
    @Column(name = "created_on")
    private ZonedDateTime createdOn;

    @Column(name = "created_by")
    private String createdBy;
}

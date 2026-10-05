package com.utm.flight.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.flight.model.enumeration.ConformanceStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.ZonedDateTime;

@Entity
@Table(name = "flight_conformance")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FlightConformance extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "flight_id", nullable = false, unique = true)
    private Flight flight;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30, nullable = false)
    @Builder.Default
    private ConformanceStatus status = ConformanceStatus.UNKNOWN;

    @Column(name = "cross_track_error_m")
    private Double crossTrackErrorM;

    @Column(name = "vertical_error_m")
    private Double verticalErrorM;

    @Column(name = "corridor_radius_m")
    @Builder.Default
    private Double corridorRadiusM = 15.0;

    @Column(name = "altitude_buffer_m")
    @Builder.Default
    private Double altitudeBufferM = 10.0;

    @Column(name = "current_latitude")
    private Double currentLatitude;

    @Column(name = "current_longitude")
    private Double currentLongitude;

    @Column(name = "current_altitude")
    private Double currentAltitude;

    @Column(name = "current_speed")
    private Double currentSpeed;

    @Column(name = "current_heading")
    private Double currentHeading;

    @Column(name = "last_telemetry_time")
    private ZonedDateTime lastTelemetryTime;

    @Column(name = "last_evaluated_at")
    private ZonedDateTime lastEvaluatedAt;

    @Column(name = "violations_json", columnDefinition = "TEXT")
    private String violationsJson;
}

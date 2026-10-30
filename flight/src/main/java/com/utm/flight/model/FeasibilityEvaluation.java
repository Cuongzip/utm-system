package com.utm.flight.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.flight.model.enumeration.Verdict;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "feasibility_evaluations")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeasibilityEvaluation extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "flight_id", nullable = false)
    private Flight flight;

    @Column(name = "drone_id", length = 36, nullable = false)
    private String droneId;

    @Enumerated(EnumType.STRING)
    @Column(name = "verdict", length = 20, nullable = false)
    private Verdict verdict;

    @Column(name = "margin_pct", nullable = false)
    private Double marginPct;

    @Column(name = "usable_wh", nullable = false)
    private Double usableWh;

    @Column(name = "required_wh", nullable = false)
    private Double requiredWh;

    @Column(name = "cruise_wh", nullable = false)
    private Double cruiseWh;

    @Column(name = "hover_wh", nullable = false)
    private Double hoverWh;

    @Column(name = "climb_wh", nullable = false)
    private Double climbWh;

    @Column(name = "payload_factor", nullable = false)
    private Double payloadFactor;

    @Column(name = "wind_factor", nullable = false)
    private Double windFactor;

    @Column(name = "wind_speed_ms")
    private Double windSpeedMs;

    @Column(name = "confidence", length = 20, nullable = false)
    private String confidence;

    @Column(name = "solutions_json", columnDefinition = "TEXT")
    private String solutionsJson;

    @Column(name = "explanation", columnDefinition = "TEXT")
    private String explanation;

    @Column(name = "explanation_source", length = 20, nullable = false)
    @Builder.Default
    private String explanationSource = "deterministic";
}

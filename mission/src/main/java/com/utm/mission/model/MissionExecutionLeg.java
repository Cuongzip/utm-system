package com.utm.mission.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.mission.model.enumeration.LegStatus;
import com.utm.mission.model.enumeration.StopoverType;
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

@Entity
@Table(name = "mission_execution_leg")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MissionExecutionLeg extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "execution_id", length = 36, nullable = false)
    private String executionId;

    @Column(name = "leg_index", nullable = false)
    private Integer legIndex;

    @Column(name = "flight_id", length = 36, unique = true)
    private String flightId;

    @Column(name = "drone_id", length = 36)
    private String droneId;

    @Column(name = "departure_hub_id", length = 36, nullable = false)
    private String departureHubId;

    @Column(name = "arrival_hub_id", length = 36, nullable = false)
    private String arrivalHubId;

    @Enumerated(EnumType.STRING)
    @Column(name = "stopover_type", length = 30, nullable = false)
    @Builder.Default
    private StopoverType stopoverType = StopoverType.NONE;

    @Column(name = "ground_time_minutes", nullable = false)
    @Builder.Default
    private Integer groundTimeMinutes = 0;

    @Column(name = "estimated_energy_wh", nullable = false)
    @Builder.Default
    private Double estimatedEnergyWh = 0.0;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50, nullable = false)
    @Builder.Default
    private LegStatus status = LegStatus.PLANNED;
}

package com.utm.fleet.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.fleet.viewmodel.FleetDtos.FleetThresholdsVm;
import com.utm.fleet.viewmodel.FleetDtos.ScoringWeightsVm;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "fleet_configuration")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FleetConfiguration extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "name", length = 120, nullable = false, unique = true)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "weights", columnDefinition = "jsonb", nullable = false)
    private ScoringWeightsVm weights;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "thresholds", columnDefinition = "jsonb", nullable = false)
    private FleetThresholdsVm thresholds;

    @Column(name = "is_preset", nullable = false)
    @Builder.Default
    private Boolean isPreset = false;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = false;
}

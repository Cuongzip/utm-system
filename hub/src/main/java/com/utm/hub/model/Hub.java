package com.utm.hub.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.hub.model.enumeration.HubStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
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
@Table(name = "hub")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Hub extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "code", length = 50, nullable = false, unique = true)
    private String code;

    @Column(name = "name", length = 255, nullable = false)
    private String name;

    @Embedded
    private Location location;

    @Column(name = "altitude_msl", nullable = false)
    @Builder.Default
    private Double altitudeMsl = 0.0;

    @Column(name = "airspace_radius", nullable = false)
    @Builder.Default
    private Double airspaceRadius = 1000.0;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50, nullable = false)
    @Builder.Default
    private HubStatus status = HubStatus.ACTIVE;
}

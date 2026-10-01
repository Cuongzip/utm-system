package com.utm.airspace.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
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

@Entity
@Table(name = "airspace_zone")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AirspaceZone extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "name", length = 255, nullable = false, unique = true)
    private String name;

    @Column(name = "type", length = 50, nullable = false)
    private String type;

    @Column(name = "floor_altitude_m", nullable = false)
    private Double floorAltitudeM;

    @Column(name = "ceiling_altitude_m", nullable = false)
    private Double ceilingAltitudeM;

    @Column(name = "geometry", columnDefinition = "TEXT", nullable = false)
    private String geometry;

    @Column(name = "hub_id", length = 36)
    private String hubId;

    @Column(name = "status", length = 50, nullable = false)
    @Builder.Default
    private String status = "active";

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
}

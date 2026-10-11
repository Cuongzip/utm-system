package com.utm.drone.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.drone.model.enumeration.DroneStatus;
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
@Table(name = "drone")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Drone extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "registration_number", length = 100, nullable = false, unique = true)
    private String registrationNumber;

    @Column(name = "manufacturer", length = 100, nullable = false)
    private String manufacturer;

    @Column(name = "model", length = 100, nullable = false)
    private String model;

    @Column(name = "owner_id", length = 36)
    private String ownerId;

    @Column(name = "home_hub_id", length = 36)
    private String homeHubId;

    @Column(name = "battery_capacity_wh", nullable = false)
    private Double batteryCapacityWh;

    @Column(name = "max_payload", nullable = false)
    private Double maxPayload;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50, nullable = false)
    @Builder.Default
    private DroneStatus status = DroneStatus.AVAILABLE;
}

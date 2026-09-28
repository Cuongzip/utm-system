package com.utm.drone.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.drone.model.enumeration.DroneStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
    @Column(name = "id", length = 36, nullable = false)
    private String id;

    @Column(name = "registration_number", length = 100, nullable = false, unique = true)
    private String registrationNumber;

    @Column(name = "model", length = 100, nullable = false)
    private String model;

    @Column(name = "manufacturer", length = 100, nullable = false)
    private String manufacturer;

    @Column(name = "max_speed_mps", nullable = false)
    private Double maxSpeedMps;

    @Column(name = "max_flight_time_min", nullable = false)
    private Integer maxFlightTimeMin;

    @Column(name = "max_payload_kg")
    private Double maxPayloadKg;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50, nullable = false)
    @Builder.Default
    private DroneStatus status = DroneStatus.AVAILABLE;

    @Column(name = "current_hub_id", length = 100)
    private String currentHubId;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}

package com.utm.flight.model;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.flight.model.enumeration.FlightStatus;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "flight")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Flight extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "flight_number", length = 100, nullable = false, unique = true)
    private String flightNumber;

    @Column(name = "drone_id", length = 36, nullable = false)
    private String droneId;

    @Column(name = "departure_hub_id", length = 36, nullable = false)
    private String departureHubId;

    @Column(name = "arrival_hub_id", length = 36, nullable = false)
    private String arrivalHubId;

    @Column(name = "pilot_id", length = 100)
    private String pilotId;

    @Column(name = "scheduled_departure", nullable = false)
    private ZonedDateTime scheduledDeparture;

    @Column(name = "scheduled_arrival", nullable = false)
    private ZonedDateTime scheduledArrival;

    @Column(name = "actual_departure")
    private ZonedDateTime actualDeparture;

    @Column(name = "actual_arrival")
    private ZonedDateTime actualArrival;

    @Column(name = "cruising_altitude_m")
    private Double cruisingAltitudeM;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50, nullable = false)
    @Builder.Default
    private FlightStatus status = FlightStatus.PLANNED;

    @OneToMany(mappedBy = "flight", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("sequence ASC")
    @Builder.Default
    private List<FlightWaypoint> waypoints = new ArrayList<>();

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    public void setWaypoints(List<FlightWaypoint> newWaypoints) {
        if (this.waypoints == null) {
            this.waypoints = new ArrayList<>();
        } else {
            this.waypoints.clear();
        }
        if (newWaypoints != null) {
            for (FlightWaypoint wp : newWaypoints) {
                addWaypoint(wp);
            }
        }
    }

    public void addWaypoint(FlightWaypoint waypoint) {
        if (waypoint != null) {
            if (this.waypoints == null) {
                this.waypoints = new ArrayList<>();
            }
            this.waypoints.add(waypoint);
            waypoint.setFlight(this);
        }
    }

    public void removeWaypoint(FlightWaypoint waypoint) {
        if (waypoint != null && this.waypoints != null) {
            this.waypoints.remove(waypoint);
            waypoint.setFlight(null);
        }
    }
}


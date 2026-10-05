package com.utm.flight.repository;

import com.utm.flight.model.FlightWaypoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FlightWaypointRepository extends JpaRepository<FlightWaypoint, String> {

    List<FlightWaypoint> findByFlightIdOrderBySequenceAsc(String flightId);

    Optional<FlightWaypoint> findByIdAndFlightId(String id, String flightId);

    Optional<FlightWaypoint> findTopByFlightIdOrderBySequenceDesc(String flightId);

    void deleteByFlightId(String flightId);
}

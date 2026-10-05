package com.utm.flight.repository;

import com.utm.flight.model.Flight;
import com.utm.flight.model.enumeration.FlightStatus;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FlightRepository extends JpaRepository<Flight, String>, JpaSpecificationExecutor<Flight> {

    boolean existsByFlightNumber(String flightNumber);

    List<Flight> findByStatus(FlightStatus status);

    List<Flight> findByDroneId(String droneId);

    List<Flight> findByPilotId(String pilotId);

    @Override
    @EntityGraph(attributePaths = {"waypoints"})
    List<Flight> findAll(@Nullable Specification<Flight> spec);

    @Override
    @EntityGraph(attributePaths = {"waypoints"})
    Optional<Flight> findById(String id);
}

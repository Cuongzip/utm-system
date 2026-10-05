package com.utm.flight.repository;

import com.utm.flight.model.FlightConformance;
import com.utm.flight.model.enumeration.ConformanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FlightConformanceRepository extends JpaRepository<FlightConformance, String>, JpaSpecificationExecutor<FlightConformance> {
    Optional<FlightConformance> findByFlightId(String flightId);
    boolean existsByFlightId(String flightId);
    List<FlightConformance> findByStatus(ConformanceStatus status);
}

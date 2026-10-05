package com.utm.flight.repository;

import com.utm.flight.model.FlightConformanceAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FlightConformanceAlertRepository extends JpaRepository<FlightConformanceAlert, String>, JpaSpecificationExecutor<FlightConformanceAlert> {
    List<FlightConformanceAlert> findByFlightIdOrderByCreatedOnDesc(String flightId);
    List<FlightConformanceAlert> findByFlightIdAndAcknowledgedFalseOrderByCreatedOnDesc(String flightId);
    long countByFlightIdAndAcknowledgedFalse(String flightId);
}

package com.utm.flight.repository;

import com.utm.flight.model.Flight;
import com.utm.flight.model.enumeration.FlightStatus;
import jakarta.persistence.LockModeType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface FlightRepository extends JpaRepository<Flight, String>, JpaSpecificationExecutor<Flight> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT f FROM Flight f WHERE f.id = :id")
    Optional<Flight> findByIdForUpdate(@Param("id") String id);

    boolean existsByFlightNumber(String flightNumber);

    boolean existsByAuthorizationNumber(String authorizationNumber);

    List<Flight> findByStatus(FlightStatus status);

    List<Flight> findByDroneId(String droneId);

    List<Flight> findByPilotId(String pilotId);

    List<Flight> findByExecutionIdOrderByScheduledDepartureAsc(String executionId);

    default List<Flight> findOverlappingFlights(
            String droneId,
            Collection<FlightStatus> statuses,
            ZonedDateTime scheduledDeparture,
            ZonedDateTime scheduledArrival,
            String excludeId
    ) {
        Specification<Flight> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("droneId"), droneId));
            predicates.add(root.get("status").in(statuses));
            predicates.add(cb.lessThan(root.get("scheduledDeparture"), scheduledArrival));
            predicates.add(cb.greaterThan(root.get("scheduledArrival"), scheduledDeparture));
            if (excludeId != null && !excludeId.isBlank()) {
                predicates.add(cb.notEqual(root.get("id"), excludeId));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        return findAll(spec);
    }

    long countByDepartureHubIdAndStatusIn(String departureHubId, Collection<FlightStatus> statuses);

    long countByArrivalHubIdAndStatusIn(String arrivalHubId, Collection<FlightStatus> statuses);

    default long countOverlappingHubFlights(
            String hubId,
            boolean departure,
            Collection<FlightStatus> statuses,
            ZonedDateTime windowStart,
            ZonedDateTime windowEnd,
            String excludeId
    ) {
        if (hubId == null || windowStart == null || windowEnd == null) {
            return departure
                    ? countByDepartureHubIdAndStatusIn(hubId, statuses)
                    : countByArrivalHubIdAndStatusIn(hubId, statuses);
        }
        Specification<Flight> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get(departure ? "departureHubId" : "arrivalHubId"), hubId));
            predicates.add(root.get("status").in(statuses));
            predicates.add(cb.lessThan(root.get("scheduledDeparture"), windowEnd));
            predicates.add(cb.greaterThan(root.get("scheduledArrival"), windowStart));
            if (excludeId != null && !excludeId.isBlank()) {
                predicates.add(cb.notEqual(root.get("id"), excludeId));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        return count(spec);
    }
}

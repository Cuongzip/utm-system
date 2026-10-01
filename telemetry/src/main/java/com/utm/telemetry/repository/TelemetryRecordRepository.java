package com.utm.telemetry.repository;

import com.utm.telemetry.model.TelemetryRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TelemetryRecordRepository extends JpaRepository<TelemetryRecord, String> {

    List<TelemetryRecord> findByFlightIdOrderByCreatedOnAsc(String flightId);

    List<TelemetryRecord> findByFlightIdAndCreatedOnBetweenOrderByCreatedOnAsc(
            String flightId, ZonedDateTime from, ZonedDateTime to);

    Optional<TelemetryRecord> findTopByFlightIdOrderByCreatedOnDesc(String flightId);

    Optional<TelemetryRecord> findTopByDroneIdOrderByCreatedOnDesc(String droneId);
}

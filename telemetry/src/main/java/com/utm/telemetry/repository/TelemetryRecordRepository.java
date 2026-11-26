package com.utm.telemetry.repository;

import com.utm.telemetry.model.TelemetryRecord;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TelemetryRecordRepository extends JpaRepository<TelemetryRecord, String> {

    List<TelemetryRecord> findByFlightIdOrderByRecordedAtAsc(String flightId, Pageable pageable);

    List<TelemetryRecord> findByFlightIdAndRecordedAtBetweenOrderByRecordedAtAsc(
            String flightId, ZonedDateTime from, ZonedDateTime to, Pageable pageable);

    Optional<TelemetryRecord> findTopByFlightIdOrderByRecordedAtDesc(String flightId);

    Optional<TelemetryRecord> findTopByDroneIdOrderByRecordedAtDesc(String droneId);

    List<TelemetryRecord> findByDroneIdOrderByRecordedAtAsc(String droneId, Pageable pageable);

    List<TelemetryRecord> findByDroneIdAndRecordedAtBetweenOrderByRecordedAtAsc(
            String droneId, ZonedDateTime from, ZonedDateTime to, Pageable pageable);

    List<TelemetryRecord> findByRecordedAtGreaterThanEqualOrderByRecordedAtDesc(
            ZonedDateTime since, Pageable pageable);
}

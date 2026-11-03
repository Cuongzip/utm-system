package com.utm.emergency.repository;

import com.utm.emergency.model.BlackboxEntry;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.List;

@Repository
public interface BlackboxEntryRepository extends JpaRepository<BlackboxEntry, String>, JpaSpecificationExecutor<BlackboxEntry> {

    List<BlackboxEntry> findByIncidentIdAndTimestampBetweenOrderByTimestampAsc(String incidentId, ZonedDateTime from, ZonedDateTime to);

    List<BlackboxEntry> findByIncidentIdOrderByTimestampAsc(String incidentId);

    List<BlackboxEntry> findByFlightIdAndTimestampBetweenOrderByTimestampAsc(String flightId, ZonedDateTime from, ZonedDateTime to, Pageable pageable);

    List<BlackboxEntry> findByFlightIdOrderByTimestampAsc(String flightId, Pageable pageable);
}
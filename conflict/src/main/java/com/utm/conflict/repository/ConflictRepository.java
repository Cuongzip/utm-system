package com.utm.conflict.repository;

import com.utm.conflict.model.Conflict;
import com.utm.conflict.model.enumeration.ConflictSeverity;
import com.utm.conflict.model.enumeration.ConflictStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface ConflictRepository extends JpaRepository<Conflict, String> {

    List<Conflict> findAllByOrderByDetectedAtDesc();

    List<Conflict> findByStatusInOrderByDetectedAtDesc(Collection<ConflictStatus> statuses);

    @Query("""
        SELECT c FROM Conflict c
        WHERE ((c.primaryFlightId = :flightA AND c.secondaryFlightId = :flightB)
           OR (c.primaryFlightId = :flightB AND c.secondaryFlightId = :flightA))
          AND c.status IN :statuses
        ORDER BY c.detectedAt DESC
    """)
    List<Conflict> findActiveBetweenFlights(
            @Param("flightA") String flightA,
            @Param("flightB") String flightB,
            @Param("statuses") Collection<ConflictStatus> statuses
    );

    @Query("""
        SELECT c FROM Conflict c
        WHERE (:status IS NULL OR c.status = :status)
          AND (:severity IS NULL OR c.severity = :severity)
          AND (:flightId IS NULL OR c.primaryFlightId = :flightId OR c.secondaryFlightId = :flightId)
        ORDER BY c.detectedAt DESC
    """)
    List<Conflict> searchConflicts(
            @Param("status") ConflictStatus status,
            @Param("severity") ConflictSeverity severity,
            @Param("flightId") String flightId
    );
}

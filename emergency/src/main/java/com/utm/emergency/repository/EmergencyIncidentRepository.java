package com.utm.emergency.repository;

import com.utm.emergency.model.EmergencyIncident;
import com.utm.emergency.model.enumeration.IncidentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmergencyIncidentRepository
              extends JpaRepository<EmergencyIncident, String>, JpaSpecificationExecutor<EmergencyIncident> {

       boolean existsByIncidentNumber(String incidentNumber);

       Optional<EmergencyIncident> findByIncidentNumber(String incidentNumber);

       List<EmergencyIncident> findByStatusInOrderByDetectedAtDesc(Collection<IncidentStatus> statuses);

       @Query("SELECT i.status as status, COUNT(i) as count FROM EmergencyIncident i " +
                     "WHERE i.detectedAt >= :from AND i.detectedAt <= :to " +
                     "GROUP BY i.status")
       List<Object[]> countByStatusGrouped(@Param("from") ZonedDateTime from, @Param("to") ZonedDateTime to);

       @Query("SELECT i.emergencyType as type, COUNT(i) as count FROM EmergencyIncident i " +
                     "WHERE i.detectedAt >= :from AND i.detectedAt <= :to " +
                     "GROUP BY i.emergencyType")
       List<Object[]> countByTypeGrouped(@Param("from") ZonedDateTime from, @Param("to") ZonedDateTime to);

       @Query("SELECT i.severity as severity, COUNT(i) as count FROM EmergencyIncident i " +
                     "WHERE i.detectedAt >= :from AND i.detectedAt <= :to " +
                     "GROUP BY i.severity")
       List<Object[]> countBySeverityGrouped(@Param("from") ZonedDateTime from, @Param("to") ZonedDateTime to);

       @Query("SELECT i.droneId as droneId, COUNT(i) as count FROM EmergencyIncident i " +
                     "WHERE i.detectedAt >= :from AND i.detectedAt <= :to " +
                     "GROUP BY i.droneId ORDER BY count DESC")
       List<Object[]> countByDroneGrouped(@Param("from") ZonedDateTime from, @Param("to") ZonedDateTime to);

       @Query("SELECT i.actionSuccess as success, COUNT(i) as count FROM EmergencyIncident i " +
                     "WHERE i.status = com.utm.emergency.model.enumeration.IncidentStatus.resolved " +
                     "AND i.detectedAt >= :from AND i.detectedAt <= :to " +
                     "GROUP BY i.actionSuccess")
       List<Object[]> countByResolutionGrouped(@Param("from") ZonedDateTime from, @Param("to") ZonedDateTime to);
}
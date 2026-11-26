package com.utm.alert.repository;

import com.utm.alert.model.Alert;
import com.utm.alert.model.enumeration.AlertStatus;
import com.utm.alert.model.enumeration.AlertType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface AlertRepository extends JpaRepository<Alert, String>, JpaSpecificationExecutor<Alert> {

    List<Alert> findByFlightIdOrderByCreatedOnDesc(String flightId);

    List<Alert> findByDroneIdOrderByCreatedOnDesc(String droneId);

    List<Alert> findByStatusNotOrderByCreatedOnDesc(AlertStatus status);

    List<Alert> findByStatusOrderByCreatedOnDesc(AlertStatus status);

    List<Alert> findByConflictIdAndStatusIn(String conflictId, Collection<AlertStatus> statuses);

    List<Alert> findByIncidentIdAndStatusIn(String incidentId, Collection<AlertStatus> statuses);

    Optional<Alert> findFirstByAlertTypeAndFlightIdAndDroneIdAndStatusInOrderByCreatedOnDesc(
            AlertType alertType, String flightId, String droneId, Collection<AlertStatus> statuses);

    long countByStatusNot(AlertStatus status);
}

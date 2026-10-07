package com.utm.alert.repository;

import com.utm.alert.model.Alert;
import com.utm.alert.model.enumeration.AlertStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertRepository extends JpaRepository<Alert, String>, JpaSpecificationExecutor<Alert> {

    List<Alert> findByFlightIdOrderByCreatedOnDesc(String flightId);

    List<Alert> findByDroneIdOrderByCreatedOnDesc(String droneId);

    List<Alert> findByResolvedFalseOrderByCreatedOnDesc();

    List<Alert> findByStatusOrderByCreatedOnDesc(AlertStatus status);

    long countByResolvedFalse();
}

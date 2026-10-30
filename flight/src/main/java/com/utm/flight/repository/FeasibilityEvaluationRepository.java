package com.utm.flight.repository;

import com.utm.flight.model.FeasibilityEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FeasibilityEvaluationRepository extends JpaRepository<FeasibilityEvaluation, String>, JpaSpecificationExecutor<FeasibilityEvaluation> {

    List<FeasibilityEvaluation> findByFlightIdOrderByCreatedOnDesc(String flightId);

    Optional<FeasibilityEvaluation> findFirstByFlightIdOrderByCreatedOnDesc(String flightId);

    List<FeasibilityEvaluation> findByDroneIdOrderByCreatedOnDesc(String droneId);
}

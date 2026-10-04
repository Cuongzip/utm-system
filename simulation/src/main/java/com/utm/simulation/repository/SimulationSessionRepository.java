package com.utm.simulation.repository;

import com.utm.simulation.model.SimulationSession;
import com.utm.simulation.model.enumeration.SimulationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SimulationSessionRepository extends JpaRepository<SimulationSession, String>, JpaSpecificationExecutor<SimulationSession> {
    List<SimulationSession> findByStatus(SimulationStatus status);
    Optional<SimulationSession> findFirstByDroneIdAndStatus(String droneId, SimulationStatus status);
    List<SimulationSession> findByDroneIdOrderByCreatedOnDesc(String droneId);
}

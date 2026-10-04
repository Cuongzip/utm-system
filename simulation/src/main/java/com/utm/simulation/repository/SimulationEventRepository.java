package com.utm.simulation.repository;

import com.utm.simulation.model.SimulationEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SimulationEventRepository extends JpaRepository<SimulationEvent, String> {
    List<SimulationEvent> findBySessionIdOrderByCreatedOnAsc(String sessionId);
}

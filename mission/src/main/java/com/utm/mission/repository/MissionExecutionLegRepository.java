package com.utm.mission.repository;

import com.utm.mission.model.MissionExecutionLeg;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MissionExecutionLegRepository extends JpaRepository<MissionExecutionLeg, String> {

    List<MissionExecutionLeg> findByExecutionIdOrderByLegIndexAsc(String executionId);

    Optional<MissionExecutionLeg> findByFlightId(String flightId);

    Optional<MissionExecutionLeg> findByExecutionIdAndLegIndex(String executionId, Integer legIndex);
}

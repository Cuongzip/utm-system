package com.utm.mission.repository;

import com.utm.mission.model.MissionExecution;
import com.utm.mission.model.enumeration.ExecutionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MissionExecutionRepository extends JpaRepository<MissionExecution, String> {

    List<MissionExecution> findByMissionIdOrderByStartedAtDesc(String missionId);

    Optional<MissionExecution> findFirstByMissionIdAndStatus(String missionId, ExecutionStatus status);
}

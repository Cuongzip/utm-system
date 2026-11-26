package com.utm.mission.repository;

import com.utm.mission.model.MissionExecution;
import com.utm.mission.model.enumeration.ExecutionStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MissionExecutionRepository extends JpaRepository<MissionExecution, String> {

    List<MissionExecution> findByMissionIdOrderByStartedAtDesc(String missionId);

    Optional<MissionExecution> findFirstByMissionIdAndStatus(String missionId, ExecutionStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM MissionExecution e WHERE e.id = :id")
    Optional<MissionExecution> findByIdForUpdate(@Param("id") String id);
}

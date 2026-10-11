package com.utm.mission.repository;

import com.utm.mission.model.Waypoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WaypointRepository extends JpaRepository<Waypoint, String> {

    List<Waypoint> findByMissionIdOrderBySequenceAsc(String missionId);

    Optional<Waypoint> findByIdAndMissionId(String id, String missionId);

    @Query("SELECT COALESCE(MAX(w.sequence), 0) FROM Waypoint w WHERE w.mission.id = :missionId")
    Integer findMaxSequenceByMissionId(@Param("missionId") String missionId);

    long countByMissionId(String missionId);
}

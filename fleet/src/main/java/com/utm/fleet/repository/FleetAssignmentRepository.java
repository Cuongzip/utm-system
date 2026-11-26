package com.utm.fleet.repository;

import com.utm.fleet.model.FleetAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FleetAssignmentRepository extends JpaRepository<FleetAssignment, String> {

    List<FleetAssignment> findByMissionIdOrderByCreatedOnDesc(String missionId);
}

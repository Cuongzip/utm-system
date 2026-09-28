package com.utm.drone.repository;

import com.utm.drone.model.Drone;
import com.utm.drone.model.enumeration.DroneStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DroneRepository extends JpaRepository<Drone, String> {

    Optional<Drone> findByRegistrationNumber(String registrationNumber);

    boolean existsByRegistrationNumber(String registrationNumber);

    List<Drone> findAllByStatus(DroneStatus status);

    List<Drone> findAllByCurrentHubId(String currentHubId);
}

package com.utm.drone.repository;

import com.utm.drone.model.DroneCommand;
import com.utm.drone.model.enumeration.CommandStatus;
import com.utm.drone.model.enumeration.CommandType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface DroneCommandRepository extends JpaRepository<DroneCommand, String>, JpaSpecificationExecutor<DroneCommand> {

    Optional<DroneCommand> findByIdAndDroneId(String id, String droneId);

    Page<DroneCommand> findByDroneIdOrderByIssuedAtDesc(String droneId, Pageable pageable);

    Page<DroneCommand> findByDroneIdAndStatusOrderByIssuedAtDesc(String droneId, CommandStatus status, Pageable pageable);

    Page<DroneCommand> findByDroneIdAndCommandTypeOrderByIssuedAtDesc(String droneId, CommandType commandType, Pageable pageable);

    Page<DroneCommand> findByDroneIdAndStatusAndCommandTypeOrderByIssuedAtDesc(String droneId, CommandStatus status, CommandType commandType, Pageable pageable);

    List<DroneCommand> findByDroneIdAndStatusInOrderByIssuedAtDesc(String droneId, Collection<CommandStatus> statuses);

    List<DroneCommand> findByFlightIdOrderByIssuedAtDesc(String flightId);
}

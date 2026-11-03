package com.utm.emergency.repository;

import com.utm.emergency.model.EmergencyProtocol;
import com.utm.emergency.model.enumeration.EmergencyType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmergencyProtocolRepository extends JpaRepository<EmergencyProtocol, String>, JpaSpecificationExecutor<EmergencyProtocol> {

    List<EmergencyProtocol> findByIsActiveOrderByPriorityAscEmergencyTypeAsc(boolean isActive);

    List<EmergencyProtocol> findAllByOrderByPriorityAscEmergencyTypeAsc();

    Optional<EmergencyProtocol> findByName(String name);

    List<EmergencyProtocol> findByEmergencyTypeAndIsActiveTrue(EmergencyType emergencyType);
}
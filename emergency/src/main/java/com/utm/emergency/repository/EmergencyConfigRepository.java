package com.utm.emergency.repository;

import com.utm.emergency.model.EmergencyConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmergencyConfigRepository extends JpaRepository<EmergencyConfig, String> {

    Optional<EmergencyConfig> findByKey(String key);
}
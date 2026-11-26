package com.utm.fleet.repository;

import com.utm.fleet.model.FleetConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FleetConfigurationRepository extends JpaRepository<FleetConfiguration, String> {

    boolean existsByNameIgnoreCase(String name);

    Optional<FleetConfiguration> findFirstByIsActiveTrue();

    List<FleetConfiguration> findAllByOrderByIsActiveDescIsPresetDescNameAsc();

    @Modifying
    @Query("UPDATE FleetConfiguration c SET c.isActive = false WHERE c.isActive = true")
    int deactivateAll();
}

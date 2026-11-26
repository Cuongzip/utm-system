package com.utm.mission.repository;

import com.utm.mission.model.MissionTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MissionTemplateRepository
        extends JpaRepository<MissionTemplate, String>, JpaSpecificationExecutor<MissionTemplate> {

    boolean existsByCode(String code);

    Optional<MissionTemplate> findByIdAndIsLatestTrue(String id);

    Optional<MissionTemplate> findByCodeAndIsLatestTrue(String code);

    List<MissionTemplate> findByCodeOrderByVersionDesc(String code);

    Optional<MissionTemplate> findByCodeAndVersion(String code, Integer version);
}

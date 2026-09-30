package com.utm.hub.repository;

import com.utm.hub.model.Hub;
import com.utm.hub.model.enumeration.HubStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HubRepository extends JpaRepository<Hub, String> {

    Optional<Hub> findByCode(String code);

    boolean existsByCode(String code);

    List<Hub> findAllByStatus(HubStatus status);
}

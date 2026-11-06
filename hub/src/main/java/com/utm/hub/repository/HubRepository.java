package com.utm.hub.repository;

import com.utm.hub.model.Hub;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface HubRepository extends JpaRepository<Hub, String>, JpaSpecificationExecutor<Hub> {

    boolean existsByCode(String code);
}

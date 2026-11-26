package com.utm.connectivity.repository;

import com.utm.connectivity.model.ManufacturerApiKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ManufacturerApiKeyRepository extends JpaRepository<ManufacturerApiKey, String> {

    Optional<ManufacturerApiKey> findByKeyHash(String keyHash);

    List<ManufacturerApiKey> findAllByOrderByCreatedOnDesc();
}

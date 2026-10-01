package com.utm.airspace.repository;

import com.utm.airspace.model.AirspaceZone;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AirspaceZoneRepository extends JpaRepository<AirspaceZone, String>, JpaSpecificationExecutor<AirspaceZone> {

    Optional<AirspaceZone> findByName(String name);

    boolean existsByName(String name);

    boolean existsByNameAndIdNot(String name, String id);

    List<AirspaceZone> findByStatusIgnoreCase(String status);

    static Specification<AirspaceZone> filterBy(String hubId, String type, String status) {
        return (root, query, cb) -> {
            var predicates = cb.conjunction();
            if (hubId != null && !hubId.isBlank()) {
                predicates = cb.and(predicates, cb.equal(root.get("hubId"), hubId));
            }
            if (type != null && !type.isBlank()) {
                predicates = cb.and(predicates, cb.equal(cb.lower(root.get("type")), type.toLowerCase()));
            }
            if (status != null && !status.isBlank()) {
                predicates = cb.and(predicates, cb.equal(cb.lower(root.get("status")), status.toLowerCase()));
            }
            return predicates;
        };
    }
}

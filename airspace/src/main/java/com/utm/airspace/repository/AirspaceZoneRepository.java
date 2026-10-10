package com.utm.airspace.repository;

import com.utm.airspace.model.AirspaceZone;
import com.utm.airspace.model.enumeration.AirspaceZoneStatus;
import com.utm.airspace.model.enumeration.AirspaceZoneType;
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

    List<AirspaceZone> findByStatus(AirspaceZoneStatus status);

    static Specification<AirspaceZone> filterBy(String hubId, String zoneTypeStr, String statusStr) {
        return (root, query, cb) -> {
            var predicates = cb.conjunction();
            if (hubId != null && !hubId.isBlank()) {
                predicates = cb.and(predicates, cb.equal(root.get("hubId"), hubId));
            }
            if (zoneTypeStr != null && !zoneTypeStr.isBlank()) {
                try {
                    AirspaceZoneType zoneType = AirspaceZoneType.fromValue(zoneTypeStr);
                    predicates = cb.and(predicates, cb.equal(root.get("zoneType"), zoneType));
                } catch (IllegalArgumentException ignored) {
                    predicates = cb.and(predicates, cb.disjunction());
                }
            }
            if (statusStr != null && !statusStr.isBlank()) {
                try {
                    AirspaceZoneStatus status = AirspaceZoneStatus.fromValue(statusStr);
                    predicates = cb.and(predicates, cb.equal(root.get("status"), status));
                } catch (IllegalArgumentException ignored) {
                    predicates = cb.and(predicates, cb.disjunction());
                }
            }
            return predicates;
        };
    }
}

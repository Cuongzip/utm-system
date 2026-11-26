package com.utm.fleet.repository;

import com.utm.fleet.model.RebalancingTask;
import com.utm.fleet.model.enumeration.RebalancingStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface RebalancingTaskRepository extends JpaRepository<RebalancingTask, String> {

    long countByStatus(RebalancingStatus status);

    List<RebalancingTask> findByStatusOrderByPriorityDescCreatedOnAsc(RebalancingStatus status);

    List<RebalancingTask> findByStatusInOrderByPriorityDescCreatedOnAsc(Collection<RebalancingStatus> statuses);

    List<RebalancingTask> findAllByOrderByCreatedOnDesc(Pageable pageable);

    Optional<RebalancingTask> findFirstByRepositioningFlightIdAndStatus(String flightId, RebalancingStatus status);

    Optional<RebalancingTask> findFirstByDroneIdAndStatusOrderByCreatedOnDesc(String droneId, RebalancingStatus status);
}

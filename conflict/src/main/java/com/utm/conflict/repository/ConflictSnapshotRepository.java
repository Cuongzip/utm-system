package com.utm.conflict.repository;

import com.utm.conflict.model.ConflictSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConflictSnapshotRepository extends JpaRepository<ConflictSnapshot, String> {

    List<ConflictSnapshot> findByConflictIdOrderByRecordedAtAsc(String conflictId);
}

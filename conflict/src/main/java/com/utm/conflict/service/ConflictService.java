package com.utm.conflict.service;

import com.utm.conflict.viewmodel.ConflictPostVm;
import com.utm.conflict.viewmodel.ConflictResolvePostVm;
import com.utm.conflict.viewmodel.ConflictVm;

import java.util.List;

public interface ConflictService {

    List<ConflictVm> getAllConflicts(String status, String severity, String flightId);

    List<ConflictVm> getActiveConflicts();

    ConflictVm getConflictById(String id);

    ConflictVm createConflict(ConflictPostVm postVm, String createdBy);

    ConflictVm acknowledgeConflict(String id, String acknowledgedBy);

    ConflictVm resolveConflict(String id, ConflictResolvePostVm resolveVm, String resolvedBy);
}

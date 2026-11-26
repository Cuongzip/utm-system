package com.utm.mission.service;

import com.utm.commonlibrary.kafka.event.FlightLifecycleEvent;
import com.utm.mission.viewmodel.execution.MissionExecutePostVm;
import com.utm.mission.viewmodel.execution.MissionExecutionAbortPostVm;
import com.utm.mission.viewmodel.execution.MissionExecutionPlanVm;
import com.utm.mission.viewmodel.execution.MissionExecutionReassignLegPostVm;
import com.utm.mission.viewmodel.execution.MissionExecutionResultVm;
import com.utm.mission.viewmodel.execution.MissionExecutionVm;

import java.util.List;

public interface MissionExecutionService {

    default MissionExecutionPlanVm getExecutionPlan(String missionId) {
        return getExecutionPlan(missionId, false);
    }

    MissionExecutionPlanVm getExecutionPlan(String missionId, boolean autoSplitByRange);

    MissionExecutionResultVm executeMission(String missionId, MissionExecutePostVm postVm);

    MissionExecutionVm getExecutionById(String id);

    List<MissionExecutionVm> getExecutionsByMissionId(String missionId);

    MissionExecutionVm pauseExecution(String executionId);

    MissionExecutionVm resumeExecution(String executionId);

    MissionExecutionVm abortExecution(String executionId, MissionExecutionAbortPostVm abortVm);

    MissionExecutionVm reassignLegDrone(String executionId, int legIndex, MissionExecutionReassignLegPostVm reassignVm);

    void handleFlightLifecycleEvent(FlightLifecycleEvent event);
}

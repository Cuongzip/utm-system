package com.utm.mission.service;

import com.utm.mission.viewmodel.execution.MissionExecutePostVm;
import com.utm.mission.viewmodel.execution.MissionExecutionResultVm;
import com.utm.mission.viewmodel.execution.MissionExecutionVm;

import java.util.List;

public interface MissionExecutionService {

    MissionExecutionResultVm executeMission(String missionId, MissionExecutePostVm postVm);

    MissionExecutionVm getExecutionById(String id);

    List<MissionExecutionVm> getExecutionsByMissionId(String missionId);
}


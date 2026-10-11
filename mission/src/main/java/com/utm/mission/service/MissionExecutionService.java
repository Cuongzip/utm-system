package com.utm.mission.service;

import com.utm.mission.viewmodel.MissionExecutePostVm;
import com.utm.mission.viewmodel.MissionExecutionResultVm;
import com.utm.mission.viewmodel.MissionExecutionVm;

import java.util.List;

public interface MissionExecutionService {

    MissionExecutionResultVm executeMission(String missionId, MissionExecutePostVm postVm);

    MissionExecutionVm getExecutionById(String id);

    List<MissionExecutionVm> getExecutionsByMissionId(String missionId);
}

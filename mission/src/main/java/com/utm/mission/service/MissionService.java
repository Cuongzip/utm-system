package com.utm.mission.service;

import com.utm.mission.viewmodel.MissionListVm;
import com.utm.mission.viewmodel.MissionPostVm;
import com.utm.mission.viewmodel.MissionPutVm;
import com.utm.mission.viewmodel.MissionVm;

public interface MissionService {

    MissionVm createMission(MissionPostVm postVm);

    MissionListVm getMissions(String status, String departureHubId, String arrivalHubId, String scheduleType, Integer limit, Integer offset);

    MissionVm getMissionById(String id);

    MissionVm updateMission(String id, MissionPutVm putVm);

    void deleteMission(String id);

    MissionVm duplicateMission(String id);
}

package com.utm.mission.mapper;

import com.utm.mission.model.MissionExecution;
import com.utm.mission.viewmodel.MissionExecutePostVm;
import com.utm.mission.viewmodel.MissionExecutionVm;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

import java.util.List;

@Mapper(
        componentModel = MappingConstants.ComponentModel.SPRING,
        builder = @Builder(disableBuilder = true)
)
public interface MissionExecutionMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "missionId", source = "missionId")
    @Mapping(target = "currentWaypointIndex", constant = "0")
    @Mapping(target = "totalWaypoints", source = "totalWaypoints")
    @Mapping(target = "completedWaypoints", constant = "0")
    @Mapping(target = "startedAt", expression = "java(java.time.ZonedDateTime.now())")
    @Mapping(target = "completedAt", ignore = true)
    @Mapping(target = "status", constant = "IN_PROGRESS")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    MissionExecution toEntity(MissionExecutePostVm postVm, String missionId, Integer totalWaypoints);

    MissionExecutionVm toVm(MissionExecution execution);

    List<MissionExecutionVm> toVmList(List<MissionExecution> executions);
}

package com.utm.mission.mapper;

import com.utm.mission.model.MissionExecution;
import com.utm.mission.model.MissionExecutionLeg;
import com.utm.mission.model.enumeration.StopoverType;
import com.utm.mission.viewmodel.execution.MissionExecutePostVm;
import com.utm.mission.viewmodel.execution.MissionExecutionLegVm;
import com.utm.mission.viewmodel.execution.MissionExecutionVm;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING, unmappedTargetPolicy = ReportingPolicy.IGNORE, builder = @Builder(disableBuilder = true))
public interface MissionExecutionMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "missionId", source = "missionId")
    @Mapping(target = "pilotId", expression = "java(postVm != null && postVm.pilotId() != null ? postVm.pilotId().trim() : null)")
    @Mapping(target = "startedAt", expression = "java(java.time.ZonedDateTime.now())")
    @Mapping(target = "completedAt", ignore = true)
    @Mapping(target = "status", constant = "IN_PROGRESS")
    @Mapping(target = "executionMode", expression = "java(postVm != null && postVm.executionMode() != null ? postVm.executionMode() : com.utm.mission.model.enumeration.ExecutionMode.SAME_DRONE_SEQUENTIAL)")
    @Mapping(target = "currentLegIndex", constant = "0")
    @Mapping(target = "totalLegs", constant = "1")
    @Mapping(target = "completedLegs", constant = "0")
    @Mapping(target = "currentWaypointIndex", constant = "0")
    @Mapping(target = "completedWaypoints", constant = "0")
    @Mapping(target = "waypointLogs", expression = "java(new java.util.ArrayList<>())")
    @Mapping(target = "triggerType", constant = "MANUAL")
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    MissionExecution toEntity(MissionExecutePostVm postVm, String missionId);

    @Mapping(target = "legs", expression = "java(java.util.List.of())")
    MissionExecutionVm toVm(MissionExecution execution);

    @Mapping(target = "legs", source = "legs")
    MissionExecutionVm toVm(MissionExecution execution, List<MissionExecutionLegVm> legs);

    List<MissionExecutionVm> toVmList(List<MissionExecution> executions);

    MissionExecutionLegVm toLegVm(MissionExecutionLeg leg);

    List<MissionExecutionLegVm> toLegVmList(List<MissionExecutionLeg> legs);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", constant = "PLANNED")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    MissionExecutionLeg toLegEntity(
            String executionId,
            Integer legIndex,
            String flightId,
            String droneId,
            String departureHubId,
            String arrivalHubId,
            StopoverType stopoverType,
            Integer groundTimeMinutes,
            Double estimatedEnergyWh);
}

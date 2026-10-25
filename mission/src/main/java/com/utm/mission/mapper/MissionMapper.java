package com.utm.mission.mapper;

import com.utm.mission.model.Mission;
import com.utm.mission.viewmodel.MissionBriefVm;
import com.utm.mission.viewmodel.MissionPostVm;
import com.utm.mission.viewmodel.MissionPutVm;
import com.utm.mission.viewmodel.MissionVm;
import org.mapstruct.BeanMapping;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;

import java.util.List;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING, uses = {
        WaypointMapper.class }, builder = @Builder(disableBuilder = true))
public interface MissionMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", constant = "DRAFT")
    @Mapping(target = "waypoints", ignore = true)
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    @Mapping(target = "name", source = "name", qualifiedByName = "trimString")
    @Mapping(target = "description", source = "description", qualifiedByName = "trimString")
    @Mapping(target = "scheduleType", source = "scheduleType", defaultExpression = "java(com.utm.mission.model.enumeration.MissionScheduleType.IMMEDIATE)")
    Mission toEntity(MissionPostVm postVm);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "waypoints", ignore = true)
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    @Mapping(target = "name", source = "name", qualifiedByName = "trimString")
    @Mapping(target = "description", source = "description", qualifiedByName = "trimString")
    void updateEntityFromVm(MissionPutVm putVm, @MappingTarget Mission entity);

    @Mapping(target = "waypointCount", expression = "java(entity.getWaypoints() != null ? entity.getWaypoints().size() : 0)")
    @Mapping(target = "estimatedDistanceMeters", ignore = true)
    @Mapping(target = "departureHub", ignore = true)
    @Mapping(target = "arrivalHub", ignore = true)
    @Mapping(target = "waypoints", source = "waypoints")
    MissionVm toVm(Mission entity);

    MissionBriefVm toBriefVm(Mission entity);

    List<MissionVm> toVmList(List<Mission> entities);

    @Named("trimString")
    default String trimString(String value) {
        return value != null ? value.trim() : null;
    }
}

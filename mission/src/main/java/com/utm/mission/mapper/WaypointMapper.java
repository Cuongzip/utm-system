package com.utm.mission.mapper;

import com.utm.mission.model.Waypoint;
import com.utm.mission.viewmodel.client.HubBriefVm;
import com.utm.mission.viewmodel.waypoint.WaypointPostVm;
import com.utm.mission.viewmodel.waypoint.WaypointPutVm;
import com.utm.mission.viewmodel.waypoint.WaypointVm;
import org.mapstruct.BeanMapping;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING, unmappedTargetPolicy = ReportingPolicy.IGNORE, builder = @Builder(disableBuilder = true))
public interface WaypointMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "mission", ignore = true)
    @Mapping(target = "sequence", ignore = true)
    @Mapping(target = "waypointType", defaultValue = "COORDINATE")
    @Mapping(target = "hubId", source = "hubId", qualifiedByName = "trimBlankToNull")
    @Mapping(target = "stopoverType", defaultValue = "NONE")
    @Mapping(target = "payloadDeltaKg", defaultValue = "0.0")
    @Mapping(target = "hoverDurationSec", defaultValue = "0")
    @Mapping(target = "waitForConfirmation", defaultValue = "false")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    Waypoint toEntity(WaypointPostVm postVm);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "mission", ignore = true)
    @Mapping(target = "sequence", ignore = true)
    @Mapping(target = "hubId", source = "hubId", qualifiedByName = "trimBlankToNull")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    void updateEntityFromVm(WaypointPutVm putVm, @MappingTarget Waypoint entity);

    @Mapping(target = "missionId", source = "mission.id")
    @Mapping(target = "warning", ignore = true)
    @Mapping(target = "hub", ignore = true)
    WaypointVm toVm(Waypoint entity);

    @Mapping(target = "missionId", source = "entity.mission.id")
    @Mapping(target = "warning", source = "warning")
    @Mapping(target = "hub", ignore = true)
    WaypointVm toVm(Waypoint entity, String warning);

    @Mapping(target = "id", source = "entity.id")
    @Mapping(target = "missionId", source = "entity.mission.id")
    @Mapping(target = "name", source = "entity.name")
    @Mapping(target = "latitude", source = "entity.latitude")
    @Mapping(target = "longitude", source = "entity.longitude")
    @Mapping(target = "warning", source = "warning")
    @Mapping(target = "hub", source = "hub")
    WaypointVm toVm(Waypoint entity, String warning, HubBriefVm hub);

    List<WaypointVm> toVmList(List<Waypoint> entities);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "mission", ignore = true)
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    Waypoint cloneEntity(Waypoint original);

    @Named("trimBlankToNull")
    default String trimBlankToNull(String value) {
        return (value != null && !value.isBlank()) ? value.trim() : null;
    }
}

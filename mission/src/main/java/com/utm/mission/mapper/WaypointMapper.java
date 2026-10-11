package com.utm.mission.mapper;

import com.utm.mission.model.Waypoint;
import com.utm.mission.viewmodel.WaypointPostVm;
import com.utm.mission.viewmodel.WaypointPutVm;
import com.utm.mission.viewmodel.WaypointVm;
import org.mapstruct.BeanMapping;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

import java.util.List;

@Mapper(
        componentModel = MappingConstants.ComponentModel.SPRING,
        builder = @Builder(disableBuilder = true)
)
public interface WaypointMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "mission", ignore = true)
    @Mapping(target = "sequence", ignore = true)
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    Waypoint toEntity(WaypointPostVm postVm);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "mission", ignore = true)
    @Mapping(target = "sequence", ignore = true)
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    void updateEntityFromVm(WaypointPutVm putVm, @MappingTarget Waypoint entity);

    @Mapping(target = "missionId", source = "mission.id")
    @Mapping(target = "warning", ignore = true)
    WaypointVm toVm(Waypoint entity);

    @Mapping(target = "missionId", source = "entity.mission.id")
    @Mapping(target = "warning", source = "warning")
    WaypointVm toVm(Waypoint entity, String warning);

    List<WaypointVm> toVmList(List<Waypoint> entities);
}

package com.utm.flight.mapper;

import com.utm.flight.model.FlightWaypoint;
import com.utm.flight.viewmodel.WaypointPostVm;
import com.utm.flight.viewmodel.WaypointPutVm;
import com.utm.flight.viewmodel.WaypointVm;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;

import java.util.List;

@Mapper(
        componentModel = "spring",
        builder = @org.mapstruct.Builder(disableBuilder = true)
)
public interface WaypointMapper {

    @Mapping(target = "flightId", source = "flight.id")
    WaypointVm toVm(FlightWaypoint waypoint);

    List<WaypointVm> toVmList(List<FlightWaypoint> waypoints);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "flight", ignore = true)
    @Mapping(target = "name", qualifiedByName = "trimWaypointName")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    FlightWaypoint toEntity(WaypointPostVm postVm);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "flight", ignore = true)
    @Mapping(target = "name", qualifiedByName = "trimWaypointName")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    FlightWaypoint toEntity(WaypointVm waypointVm);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "flight", ignore = true)
    @Mapping(target = "name", qualifiedByName = "trimWaypointName")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    void updateEntityFromPutVm(@MappingTarget FlightWaypoint waypoint, WaypointPutVm putVm);

    @Named("trimWaypointName")
    default String trimWaypointName(String value) {
        return value != null ? value.trim() : null;
    }
}

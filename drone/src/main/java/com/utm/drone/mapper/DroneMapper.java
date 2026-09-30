package com.utm.drone.mapper;

import com.utm.drone.model.Drone;
import com.utm.drone.model.enumeration.DroneStatus;
import com.utm.drone.viewmodel.DronePostVm;
import com.utm.drone.viewmodel.DronePutVm;
import com.utm.drone.viewmodel.DroneVm;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(
        componentModel = "spring",
        builder = @org.mapstruct.Builder(disableBuilder = true)
)
public interface DroneMapper {

    @Mapping(target = "status", source = "status", qualifiedByName = "mapStatusToString")
    DroneVm toVm(Drone drone);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "registrationNumber", qualifiedByName = "trimString")
    @Mapping(target = "model", qualifiedByName = "trimString")
    @Mapping(target = "manufacturer", qualifiedByName = "trimString")
    @Mapping(target = "currentHubId", qualifiedByName = "trimString")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    Drone toEntity(DronePostVm dronePostVm);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "registrationNumber", ignore = true)
    @Mapping(target = "model", ignore = true)
    @Mapping(target = "manufacturer", ignore = true)
    @Mapping(target = "currentHubId", qualifiedByName = "trimString")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    void updateEntityFromPutVm(@MappingTarget Drone drone, DronePutVm dronePutVm);

    @Named("mapStatusToString")
    default String mapStatusToString(DroneStatus status) {
        return status != null ? status.getValue() : null;
    }

    @Named("trimString")
    default String trimString(String value) {
        return value != null ? value.trim() : null;
    }
}

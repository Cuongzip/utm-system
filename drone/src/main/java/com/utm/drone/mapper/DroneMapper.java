package com.utm.drone.mapper;

import com.utm.drone.model.Drone;
import com.utm.drone.model.enumeration.DroneStatus;
import com.utm.drone.viewmodel.DeviceRegistrationBriefVm;
import com.utm.drone.viewmodel.DronePostVm;
import com.utm.drone.viewmodel.DronePutVm;
import com.utm.drone.viewmodel.DroneVm;
import com.utm.drone.viewmodel.HubBriefVm;
import com.utm.drone.viewmodel.OrganizationBriefVm;
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

    @Mapping(target = "id", source = "drone.id")
    @Mapping(target = "registrationNumber", source = "drone.registrationNumber")
    @Mapping(target = "manufacturer", source = "drone.manufacturer")
    @Mapping(target = "model", source = "drone.model")
    @Mapping(target = "ownerId", source = "drone.ownerId")
    @Mapping(target = "homeHubId", source = "drone.homeHubId")
    @Mapping(target = "batteryCapacityWh", source = "drone.batteryCapacityWh")
    @Mapping(target = "maxPayload", source = "drone.maxPayload")
    @Mapping(target = "status", source = "drone.status", qualifiedByName = "mapStatusToString")
    @Mapping(target = "owner", source = "owner")
    @Mapping(target = "homeHub", source = "homeHub")
    @Mapping(target = "deviceRegistration", source = "deviceRegistration")
    @Mapping(target = "createdOn", source = "drone.createdOn")
    @Mapping(target = "createdBy", source = "drone.createdBy")
    @Mapping(target = "lastModifiedOn", source = "drone.lastModifiedOn")
    @Mapping(target = "lastModifiedBy", source = "drone.lastModifiedBy")
    DroneVm toVm(Drone drone, OrganizationBriefVm owner, HubBriefVm homeHub, DeviceRegistrationBriefVm deviceRegistration);

    @Mapping(target = "status", source = "drone.status", qualifiedByName = "mapStatusToString")
    @Mapping(target = "owner", ignore = true)
    @Mapping(target = "homeHub", ignore = true)
    @Mapping(target = "deviceRegistration", ignore = true)
    DroneVm toVm(Drone drone);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", constant = "AVAILABLE")
    @Mapping(target = "registrationNumber", qualifiedByName = "trimString")
    @Mapping(target = "model", qualifiedByName = "trimString")
    @Mapping(target = "manufacturer", qualifiedByName = "trimString")
    @Mapping(target = "ownerId", qualifiedByName = "trimString")
    @Mapping(target = "homeHubId", qualifiedByName = "trimString")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    Drone toEntity(DronePostVm postVm);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "registrationNumber", ignore = true)
    @Mapping(target = "model", ignore = true)
    @Mapping(target = "manufacturer", ignore = true)
    @Mapping(target = "ownerId", ignore = true)
    @Mapping(target = "homeHubId", qualifiedByName = "trimString")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    void updateEntityFromPutVm(@MappingTarget Drone drone, DronePutVm putVm);

    @Named("mapStatusToString")
    default String mapStatusToString(DroneStatus status) {
        return status != null ? status.getValue() : null;
    }

    @Named("trimString")
    default String trimString(String value) {
        return (value != null && !value.isBlank()) ? value.trim() : null;
    }
}

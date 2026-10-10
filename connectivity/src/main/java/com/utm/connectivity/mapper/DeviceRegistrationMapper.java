package com.utm.connectivity.mapper;

import com.utm.connectivity.model.DeviceRegistration;
import com.utm.connectivity.model.enumeration.DeviceConnectionStatus;
import com.utm.connectivity.viewmodel.DeviceRegistrationPostVm;
import com.utm.connectivity.viewmodel.DeviceRegistrationVm;
import com.utm.connectivity.viewmodel.DroneResponseVm;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

@Mapper(
        componentModel = "spring",
        builder = @org.mapstruct.Builder(disableBuilder = true)
)
public interface DeviceRegistrationMapper {

    @Mapping(target = "id", source = "entity.id")
    @Mapping(target = "droneId", source = "entity.droneId")
    @Mapping(target = "droneRegistrationNumber", source = "drone.registrationNumber")
    @Mapping(target = "droneModel", source = "drone.model")
    @Mapping(target = "deviceIdentifier", source = "entity.deviceIdentifier")
    @Mapping(target = "connectionStatus", source = "entity.connectionStatus", qualifiedByName = "mapStatusToString")
    @Mapping(target = "socketId", source = "entity.socketId")
    @Mapping(target = "certificateFingerprint", source = "entity.certificateFingerprint")
    @Mapping(target = "lastSeenAt", source = "entity.lastSeenAt")
    @Mapping(target = "createdOn", source = "entity.createdOn")
    @Mapping(target = "lastModifiedOn", source = "entity.lastModifiedOn")
    DeviceRegistrationVm toVm(DeviceRegistration entity, DroneResponseVm drone);

    default DeviceRegistrationVm toVm(DeviceRegistration entity) {
        return toVm(entity, null);
    }

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "connectionStatus", constant = "OFFLINE")
    @Mapping(target = "socketId", ignore = true)
    @Mapping(target = "lastSeenAt", ignore = true)
    @Mapping(target = "droneId", qualifiedByName = "trimString")
    @Mapping(target = "deviceIdentifier", qualifiedByName = "trimString")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    DeviceRegistration toEntity(DeviceRegistrationPostVm postVm);

    @Named("mapStatusToString")
    default String mapStatusToString(DeviceConnectionStatus status) {
        return status != null ? status.getValue() : null;
    }

    @Named("trimString")
    default String trimString(String value) {
        return value != null ? value.trim() : null;
    }
}

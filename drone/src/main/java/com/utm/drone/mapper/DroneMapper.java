package com.utm.drone.mapper;

import com.utm.drone.model.Drone;
import com.utm.drone.viewmodel.client.DeviceRegistrationBriefVm;
import com.utm.drone.viewmodel.client.HubBriefVm;
import com.utm.drone.viewmodel.client.OrganizationBriefVm;
import com.utm.drone.viewmodel.drone.DronePostVm;
import com.utm.drone.viewmodel.drone.DronePutVm;
import com.utm.drone.viewmodel.drone.DroneVm;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

@Mapper(
        componentModel = MappingConstants.ComponentModel.SPRING,
        unmappedTargetPolicy = ReportingPolicy.IGNORE,
        builder = @org.mapstruct.Builder(disableBuilder = true)
)
public interface DroneMapper {

    @Mapping(target = "id", source = "drone.id")
    @Mapping(target = "registrationNumber", source = "drone.registrationNumber")
    @Mapping(target = "serialNumber", source = "drone.serialNumber")
    @Mapping(target = "manufacturer", source = "drone.manufacturer")
    @Mapping(target = "model", source = "drone.model")
    @Mapping(target = "ownerId", source = "drone.ownerId")
    @Mapping(target = "homeHubId", source = "drone.homeHubId")
    @Mapping(target = "currentHubId", source = "drone.currentHubId")
    @Mapping(target = "batteryCapacityWh", source = "drone.batteryCapacityWh")
    @Mapping(target = "currentBatteryPct", source = "drone.currentBatteryPct")
    @Mapping(target = "maxPayload", source = "drone.maxPayload")
    @Mapping(target = "maxAltitude", source = "drone.maxAltitude")
    @Mapping(target = "maxSpeed", source = "drone.maxSpeed")
    @Mapping(target = "hoverPowerW", source = "drone.hoverPowerW")
    @Mapping(target = "cruisePowerW", source = "drone.cruisePowerW")
    @Mapping(target = "cruiseSpeedMs", source = "drone.cruiseSpeedMs")
    @Mapping(target = "batteryHealthPct", source = "drone.batteryHealthPct")
    @Mapping(target = "windToleranceMs", source = "drone.windToleranceMs")
    @Mapping(target = "maxFlightTimeMin", source = "drone.maxFlightTimeMin")
    @Mapping(target = "maxRangeM", source = "drone.maxRangeM")
    @Mapping(target = "communicationProtocol", source = "drone.communicationProtocol")
    @Mapping(target = "remoteId", source = "drone.remoteId")
    @Mapping(target = "capabilities", source = "drone.capabilities")
    @Mapping(target = "specifications", source = "drone.specifications")
    @Mapping(target = "telemetryConfig", source = "drone.telemetryConfig")
    @Mapping(target = "lastMaintenance", source = "drone.lastMaintenance")
    @Mapping(target = "nextMaintenance", source = "drone.nextMaintenance")
    @Mapping(target = "totalFlightHours", source = "drone.totalFlightHours")
    @Mapping(target = "totalFlights", source = "drone.totalFlights")
    @Mapping(target = "status", source = "drone.status")
    @Mapping(target = "owner", source = "owner")
    @Mapping(target = "homeHub", source = "homeHub")
    @Mapping(target = "deviceRegistration", source = "deviceRegistration")
    @Mapping(target = "createdOn", source = "drone.createdOn")
    @Mapping(target = "createdBy", source = "drone.createdBy")
    @Mapping(target = "lastModifiedOn", source = "drone.lastModifiedOn")
    @Mapping(target = "lastModifiedBy", source = "drone.lastModifiedBy")
    DroneVm toVm(Drone drone, OrganizationBriefVm owner, HubBriefVm homeHub,
            DeviceRegistrationBriefVm deviceRegistration);

    @Mapping(target = "owner", ignore = true)
    @Mapping(target = "homeHub", ignore = true)
    @Mapping(target = "deviceRegistration", ignore = true)
    DroneVm toVm(Drone drone);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", constant = "AVAILABLE")
    @Mapping(target = "registrationNumber", qualifiedByName = "trimString")
    @Mapping(target = "serialNumber", qualifiedByName = "trimString")
    @Mapping(target = "remoteId", qualifiedByName = "trimString")
    @Mapping(target = "model", qualifiedByName = "trimString")
    @Mapping(target = "manufacturer", qualifiedByName = "trimString")
    @Mapping(target = "ownerId", qualifiedByName = "trimString")
    @Mapping(target = "homeHubId", qualifiedByName = "trimString")
    @Mapping(target = "currentHubId", qualifiedByName = "trimString")
    @Mapping(target = "currentBatteryPct", defaultValue = "100.0")
    @Mapping(target = "maxAltitude", defaultValue = "120.0")
    @Mapping(target = "maxSpeed", defaultValue = "20.0")
    @Mapping(target = "communicationProtocol", defaultValue = "WEBSOCKET")
    @Mapping(target = "hoverPowerW", defaultValue = "350.0")
    @Mapping(target = "cruisePowerW", defaultValue = "280.0")
    @Mapping(target = "cruiseSpeedMs", defaultValue = "15.0")
    @Mapping(target = "batteryHealthPct", defaultValue = "100.0")
    @Mapping(target = "windToleranceMs", defaultValue = "12.0")
    @Mapping(target = "maxFlightTimeMin", defaultValue = "40")
    @Mapping(target = "maxRangeM", defaultValue = "25000.0")
    @Mapping(target = "totalFlightHours", constant = "0.0")
    @Mapping(target = "totalFlights", constant = "0")
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    Drone toEntity(DronePostVm postVm);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "registrationNumber", ignore = true)
    @Mapping(target = "serialNumber", qualifiedByName = "trimString")
    @Mapping(target = "remoteId", qualifiedByName = "trimString")
    @Mapping(target = "model", ignore = true)
    @Mapping(target = "manufacturer", ignore = true)
    @Mapping(target = "ownerId", ignore = true)
    @Mapping(target = "homeHubId", qualifiedByName = "trimString")
    @Mapping(target = "currentHubId", qualifiedByName = "trimString")
    @Mapping(target = "totalFlightHours", ignore = true)
    @Mapping(target = "totalFlights", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    void updateEntityFromPutVm(@MappingTarget Drone drone, DronePutVm putVm);

    @Named("trimString")
    default String trimString(String value) {
        return (value != null && !value.isBlank()) ? value.trim() : null;
    }
}

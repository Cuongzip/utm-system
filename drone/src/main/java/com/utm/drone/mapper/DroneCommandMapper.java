package com.utm.drone.mapper;

import com.utm.drone.model.DroneCommand;
import com.utm.drone.viewmodel.DroneCommandPostVm;
import com.utm.drone.viewmodel.DroneCommandVm;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.List;

@Mapper(
        componentModel = "spring",
        builder = @org.mapstruct.Builder(disableBuilder = true)
)
public interface DroneCommandMapper {

    DroneCommandVm toVm(DroneCommand command);

    List<DroneCommandVm> toVmList(List<DroneCommand> commands);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "droneId", source = "droneId", qualifiedByName = "trimString")
    @Mapping(target = "flightId", source = "postVm.flightId", qualifiedByName = "trimString")
    @Mapping(target = "commandType", source = "postVm.commandType")
    @Mapping(target = "parameters", source = "postVm.parameters")
    @Mapping(target = "status", constant = "PENDING")
    @Mapping(target = "issuedBy", source = "issuedBy")
    @Mapping(target = "issuedAt", expression = "java(java.time.Instant.now())")
    @Mapping(target = "acknowledgedAt", ignore = true)
    @Mapping(target = "completedAt", ignore = true)
    @Mapping(target = "errorMessage", ignore = true)
    @Mapping(target = "priority", source = "priority")
    @Mapping(target = "timeoutMs", source = "timeoutMs")
    @Mapping(target = "retryCount", constant = "0")
    @Mapping(target = "maxRetries", source = "maxRetries")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    DroneCommand toEntity(DroneCommandPostVm postVm, String droneId, String issuedBy, Integer priority, Integer timeoutMs, Integer maxRetries);

    @Named("trimString")
    default String trimString(String value) {
        return (value != null && !value.isBlank()) ? value.trim() : null;
    }
}

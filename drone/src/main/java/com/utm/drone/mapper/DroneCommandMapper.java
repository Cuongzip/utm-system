package com.utm.drone.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.drone.model.DroneCommand;
import com.utm.drone.viewmodel.command.DroneCommandPostVm;
import com.utm.drone.viewmodel.command.DroneCommandVm;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;

import java.util.List;
import java.util.Map;

@Mapper(
        componentModel = MappingConstants.ComponentModel.SPRING,
        unmappedTargetPolicy = ReportingPolicy.IGNORE,
        builder = @org.mapstruct.Builder(disableBuilder = true)
)
public interface DroneCommandMapper {

    ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    TypeReference<Map<String, Object>> MAP_TYPE_REF = new TypeReference<>() {};

    @Mapping(target = "parameters", source = "parameters", qualifiedByName = "mapToJson")
    DroneCommandVm toVm(DroneCommand command);

    List<DroneCommandVm> toVmList(List<DroneCommand> commands);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "droneId", source = "droneId", qualifiedByName = "trimString")
    @Mapping(target = "flightId", source = "postVm.flightId", qualifiedByName = "trimString")
    @Mapping(target = "commandType", source = "postVm.commandType")
    @Mapping(target = "parameters", source = "postVm.parameters", qualifiedByName = "jsonToMap")
    @Mapping(target = "status", constant = "PENDING")
    @Mapping(target = "issuedBy", source = "issuedBy")
    @Mapping(target = "issuedAt", expression = "java(java.time.ZonedDateTime.now())")
    @Mapping(target = "acknowledgedAt", ignore = true)
    @Mapping(target = "completedAt", ignore = true)
    @Mapping(target = "errorMessage", ignore = true)
    @Mapping(target = "priority", source = "priority")
    @Mapping(target = "timeoutMs", source = "timeoutMs")
    @Mapping(target = "retryCount", constant = "0")
    @Mapping(target = "maxRetries", source = "maxRetries")
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    DroneCommand toEntity(DroneCommandPostVm postVm, String droneId, String issuedBy, Integer priority, Integer timeoutMs, Integer maxRetries);

    @Named("trimString")
    default String trimString(String value) {
        return (value != null && !value.isBlank()) ? value.trim() : null;
    }

    @Named("jsonToMap")
    default Map<String, Object> jsonToMap(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return OBJECT_MAPPER.readValue(json, MAP_TYPE_REF);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Command parameters must be a valid JSON object", e);
        }
    }

    @Named("mapToJson")
    default String mapToJson(Map<String, Object> map) {
        if (map == null) {
            return null;
        }
        try {
            return OBJECT_MAPPER.writeValueAsString(map);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize command parameters", e);
        }
    }
}


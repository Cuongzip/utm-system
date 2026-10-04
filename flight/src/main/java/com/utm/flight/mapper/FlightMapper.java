package com.utm.flight.mapper;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.flight.model.Flight;
import com.utm.flight.model.enumeration.FlightStatus;
import com.utm.flight.viewmodel.FlightPostVm;
import com.utm.flight.viewmodel.FlightPutVm;
import com.utm.flight.viewmodel.FlightVm;
import com.utm.flight.viewmodel.WaypointVm;
import lombok.extern.slf4j.Slf4j;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.Collections;
import java.util.List;

@Mapper(
        componentModel = "spring",
        builder = @org.mapstruct.Builder(disableBuilder = true)
)
@Slf4j
public abstract class FlightMapper {

    @Autowired
    protected ObjectMapper objectMapper;

    @Mapping(target = "status", source = "status", qualifiedByName = "mapStatusToString")
    @Mapping(target = "waypoints", source = "waypointsJson", qualifiedByName = "deserializeWaypoints")
    public abstract FlightVm toVm(Flight flight);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "actualDeparture", ignore = true)
    @Mapping(target = "actualArrival", ignore = true)
    @Mapping(target = "flightNumber", qualifiedByName = "trimString")
    @Mapping(target = "droneId", qualifiedByName = "trimString")
    @Mapping(target = "departureHubId", qualifiedByName = "trimString")
    @Mapping(target = "arrivalHubId", qualifiedByName = "trimString")
    @Mapping(target = "pilotId", qualifiedByName = "trimString")
    @Mapping(target = "waypointsJson", source = "waypoints", qualifiedByName = "serializeWaypoints")
    @Mapping(target = "totalWaypoints", source = "waypoints", qualifiedByName = "countWaypoints")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    public abstract Flight toEntity(FlightPostVm flightPostVm);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "flightNumber", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "actualDeparture", ignore = true)
    @Mapping(target = "actualArrival", ignore = true)
    @Mapping(target = "droneId", qualifiedByName = "trimString")
    @Mapping(target = "departureHubId", qualifiedByName = "trimString")
    @Mapping(target = "arrivalHubId", qualifiedByName = "trimString")
    @Mapping(target = "pilotId", qualifiedByName = "trimString")
    @Mapping(target = "waypointsJson", source = "waypoints", qualifiedByName = "serializeWaypoints")
    @Mapping(target = "totalWaypoints", source = "waypoints", qualifiedByName = "countWaypoints")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    public abstract void updateEntityFromPutVm(@MappingTarget Flight flight, FlightPutVm flightPutVm);

    @Named("mapStatusToString")
    public String mapStatusToString(FlightStatus status) {
        return status != null ? status.getValue() : null;
    }

    @Named("trimString")
    public String trimString(String value) {
        return value != null ? value.trim() : null;
    }

    @Named("serializeWaypoints")
    public String serializeWaypoints(List<WaypointVm> waypoints) {
        if (waypoints == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(waypoints);
        } catch (Exception e) {
            log.error("Failed to serialize waypoints: {}", e.getMessage());
            return "[]";
        }
    }

    @Named("deserializeWaypoints")
    public List<WaypointVm> deserializeWaypoints(String waypointsJson) {
        if (waypointsJson == null || waypointsJson.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(waypointsJson, new TypeReference<List<WaypointVm>>() {});
        } catch (Exception e) {
            log.error("Failed to deserialize waypoints: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    @Named("countWaypoints")
    public Integer countWaypoints(List<WaypointVm> waypoints) {
        return waypoints != null ? waypoints.size() : null;
    }
}

package com.utm.flight.mapper;

import com.utm.flight.model.Flight;
import com.utm.flight.model.enumeration.FlightAuthorizationStatus;
import com.utm.flight.model.enumeration.FlightStatus;
import com.utm.flight.viewmodel.FlightPostVm;
import com.utm.flight.viewmodel.FlightPutVm;
import com.utm.flight.viewmodel.FlightVm;
import org.mapstruct.BeanMapping;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;

import java.util.List;

@Mapper(
        componentModel = MappingConstants.ComponentModel.SPRING,
        uses = {WaypointMapper.class},
        builder = @Builder(disableBuilder = true)
)
public interface FlightMapper {

    @Mapping(target = "status", source = "status", qualifiedByName = "mapStatusToString")
    @Mapping(target = "authorizationStatus", source = "authorizationStatus", qualifiedByName = "mapAuthStatusToString")
    @Mapping(target = "totalWaypoints", source = "flight", qualifiedByName = "mapTotalWaypoints")
    @Mapping(target = "waypoints", source = "waypoints")
    FlightVm toVm(Flight flight);

    List<FlightVm> toVmList(List<Flight> flights);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "authorizationStatus", ignore = true)
    @Mapping(target = "actualDeparture", ignore = true)
    @Mapping(target = "actualArrival", ignore = true)
    @Mapping(target = "flightNumber", qualifiedByName = "trimString")
    @Mapping(target = "droneId", qualifiedByName = "trimString")
    @Mapping(target = "departureHubId", qualifiedByName = "trimString")
    @Mapping(target = "arrivalHubId", qualifiedByName = "trimString")
    @Mapping(target = "pilotId", qualifiedByName = "trimString")
    @Mapping(target = "executionId", qualifiedByName = "trimString")
    @Mapping(target = "waypoints", ignore = true)
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    Flight toEntity(FlightPostVm flightPostVm);

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
    @Mapping(target = "executionId", ignore = true)
    @Mapping(target = "authorizationStatus", ignore = true)
    @Mapping(target = "waypoints", ignore = true)
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    void updateEntityFromPutVm(@MappingTarget Flight flight, FlightPutVm flightPutVm);

    @Named("mapStatusToString")
    default String mapStatusToString(FlightStatus status) {
        return status != null ? status.getValue() : null;
    }

    @Named("mapAuthStatusToString")
    default String mapAuthStatusToString(FlightAuthorizationStatus status) {
        return status != null ? status.getValue() : null;
    }

    @Named("trimString")
    default String trimString(String value) {
        return value != null ? value.trim() : null;
    }

    @Named("mapTotalWaypoints")
    default Integer mapTotalWaypoints(Flight flight) {
        if (flight == null || flight.getWaypoints() == null) {
            return 0;
        }
        return flight.getWaypoints().size();
    }
}

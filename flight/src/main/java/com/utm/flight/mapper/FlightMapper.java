package com.utm.flight.mapper;

import com.utm.flight.model.Flight;
import com.utm.flight.model.enumeration.FlightStatus;
import com.utm.flight.viewmodel.FlightPostVm;
import com.utm.flight.viewmodel.FlightPutVm;
import com.utm.flight.viewmodel.FlightVm;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(
        componentModel = "spring",
        uses = {WaypointMapper.class},
        builder = @org.mapstruct.Builder(disableBuilder = true)
)
public abstract class FlightMapper {

    @Mapping(target = "status", source = "status", qualifiedByName = "mapStatusToString")
    @Mapping(target = "totalWaypoints", source = "flight", qualifiedByName = "mapTotalWaypoints")
    @Mapping(target = "waypoints", source = "waypoints")
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
    @Mapping(target = "waypoints", ignore = true)
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
    @Mapping(target = "waypoints", ignore = true)
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

    @Named("mapTotalWaypoints")
    public Integer mapTotalWaypoints(Flight flight) {
        if (flight == null || flight.getWaypoints() == null) {
            return 0;
        }
        return flight.getWaypoints().size();
    }
}

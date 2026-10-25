package com.utm.flight.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.flight.model.Flight;
import com.utm.flight.viewmodel.FlightPostVm;
import com.utm.flight.viewmodel.FlightPutVm;
import com.utm.flight.viewmodel.FlightVm;
import com.utm.flight.viewmodel.GeoJsonLineStringVm;
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
        builder = @Builder(disableBuilder = true)
)
public interface FlightMapper {

    ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Mapping(target = "plannedRoute", source = "plannedRoute", qualifiedByName = "stringToLineString")
    @Mapping(target = "actualRoute", source = "actualRoute", qualifiedByName = "stringToLineString")
    FlightVm toVm(Flight flight);

    List<FlightVm> toVmList(List<Flight> flights);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "authorizationStatus", ignore = true)
    @Mapping(target = "conformanceStatus", ignore = true)
    @Mapping(target = "actualDeparture", ignore = true)
    @Mapping(target = "actualArrival", ignore = true)
    @Mapping(target = "flightNumber", qualifiedByName = "trimString")
    @Mapping(target = "droneId", qualifiedByName = "trimString")
    @Mapping(target = "departureHubId", qualifiedByName = "trimString")
    @Mapping(target = "arrivalHubId", qualifiedByName = "trimString")
    @Mapping(target = "pilotId", qualifiedByName = "trimString")
    @Mapping(target = "executionId", qualifiedByName = "trimString")
    @Mapping(target = "plannedRoute", source = "plannedRoute", qualifiedByName = "lineStringToString")
    @Mapping(target = "actualRoute", ignore = true)
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
    @Mapping(target = "conformanceStatus", ignore = true)
    @Mapping(target = "plannedRoute", source = "plannedRoute", qualifiedByName = "lineStringToString")
    @Mapping(target = "actualRoute", source = "actualRoute", qualifiedByName = "lineStringToString")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    void updateEntityFromPutVm(@MappingTarget Flight flight, FlightPutVm flightPutVm);

    @Named("trimString")
    default String trimString(String value) {
        return value != null ? value.trim() : null;
    }

    @Named("stringToLineString")
    default GeoJsonLineStringVm stringToLineString(String routeJson) {
        if (routeJson == null || routeJson.isBlank()) {
            return GeoJsonLineStringVm.empty();
        }
        try {
            return OBJECT_MAPPER.readValue(routeJson, GeoJsonLineStringVm.class);
        } catch (JsonProcessingException e) {
            return GeoJsonLineStringVm.empty();
        }
    }

    @Named("lineStringToString")
    default String lineStringToString(GeoJsonLineStringVm lineStringVm) {
        if (lineStringVm == null) {
            return null;
        }
        try {
            return OBJECT_MAPPER.writeValueAsString(lineStringVm);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to serialize route GeoJSON LineString", e);
        }
    }
}

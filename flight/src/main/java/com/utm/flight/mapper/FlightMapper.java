package com.utm.flight.mapper;

import com.utm.flight.model.Flight;
import com.utm.flight.model.FlightWaypoint;
import com.utm.flight.model.GeoJsonLineString;
import com.utm.flight.viewmodel.flight.FlightPostVm;
import com.utm.flight.viewmodel.flight.FlightPutVm;
import com.utm.flight.viewmodel.flight.FlightVm;
import com.utm.flight.viewmodel.flight.FlightWaypointVm;
import com.utm.flight.viewmodel.flight.GeoJsonLineStringVm;
import org.mapstruct.BeanMapping;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING, builder = @Builder(disableBuilder = true), unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface FlightMapper {

    FlightVm toVm(Flight flight);

    List<FlightVm> toVmList(List<Flight> flights);

    FlightWaypoint toWaypointModel(FlightWaypointVm vm);

    FlightWaypointVm toWaypointVm(FlightWaypoint model);

    List<FlightWaypoint> toWaypointModels(List<FlightWaypointVm> vms);

    List<FlightWaypointVm> toWaypointVms(List<FlightWaypoint> models);

    default GeoJsonLineString toLineStringModel(GeoJsonLineStringVm vm) {
        if (vm == null) {
            return null;
        }
        return GeoJsonLineString.of(vm.coordinates());
    }

    default GeoJsonLineStringVm toLineStringVm(GeoJsonLineString model) {
        if (model == null || model.coordinates() == null) {
            return GeoJsonLineStringVm.empty();
        }
        return GeoJsonLineStringVm.of(model.coordinates());
    }

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
    @Mapping(target = "missionId", qualifiedByName = "trimString")
    @Mapping(target = "dependsOnFlightId", qualifiedByName = "trimString")
    @Mapping(target = "payloadWeightKg", defaultValue = "0.0")
    @Mapping(target = "minimumTurnaroundMinutes", defaultValue = "0")
    @Mapping(target = "arrivalStopoverType", defaultValue = "none")
    @Mapping(target = "endingBatteryPct", ignore = true)
    @Mapping(target = "flightType", defaultValue = "DELIVERY")
    @Mapping(target = "operationMode", defaultValue = "AUTONOMOUS")
    @Mapping(target = "actualRoute", ignore = true)
    @Mapping(target = "feasibilityVerdict", ignore = true)
    @Mapping(target = "feasibilityOverride", ignore = true)
    @Mapping(target = "version", ignore = true)
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
    @Mapping(target = "missionId", ignore = true)
    @Mapping(target = "legIndex", ignore = true)
    @Mapping(target = "totalLegs", ignore = true)
    @Mapping(target = "dependsOnFlightId", qualifiedByName = "trimString")
    @Mapping(target = "endingBatteryPct", ignore = true)
    @Mapping(target = "authorizationStatus", ignore = true)
    @Mapping(target = "conformanceStatus", ignore = true)
    @Mapping(target = "feasibilityVerdict", ignore = true)
    @Mapping(target = "feasibilityOverride", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    void updateEntityFromPutVm(@MappingTarget Flight flight, FlightPutVm flightPutVm);

    @Named("trimString")
    default String trimString(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

package com.utm.simulation.mapper;

import com.utm.simulation.model.SimulationEvent;
import com.utm.simulation.model.SimulationSession;
import com.utm.simulation.model.enumeration.SimulationStatus;
import com.utm.simulation.viewmodel.SimulationEventVm;
import com.utm.simulation.viewmodel.SimulationSessionCreateVm;
import com.utm.simulation.viewmodel.SimulationSessionVm;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

@Mapper(
        componentModel = "spring",
        builder = @org.mapstruct.Builder(disableBuilder = true)
)
public interface SimulationMapper {

    @Mapping(target = "status", source = "status", qualifiedByName = "mapStatusToString")
    @Mapping(target = "currentLat", source = "currentLat", qualifiedByName = "roundCoord")
    @Mapping(target = "currentLon", source = "currentLon", qualifiedByName = "roundCoord")
    @Mapping(target = "currentAlt", source = "currentAlt", qualifiedByName = "roundOneDecimal")
    @Mapping(target = "currentHeading", source = "currentHeading", qualifiedByName = "roundOneDecimal")
    @Mapping(target = "currentBattery", source = "currentBattery", qualifiedByName = "roundOneDecimal")
    @Mapping(target = "totalDistance", source = "totalDistance", qualifiedByName = "roundOneDecimal")
    @Mapping(target = "traveledDistance", source = "traveledDistance", qualifiedByName = "roundOneDecimal")
    SimulationSessionVm toVm(SimulationSession session);

    @Mapping(target = "type", source = "eventType")
    SimulationEventVm toVm(SimulationEvent event);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "flightId", source = "flightId")
    @Mapping(target = "droneId", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "currentLat", ignore = true)
    @Mapping(target = "currentLon", ignore = true)
    @Mapping(target = "currentAlt", ignore = true)
    @Mapping(target = "currentHeading", ignore = true)
    @Mapping(target = "currentBattery", source = "startBattery")
    @Mapping(target = "progress", constant = "0.0")
    @Mapping(target = "totalDistance", ignore = true)
    @Mapping(target = "traveledDistance", constant = "0.0")
    @Mapping(target = "currentSegment", constant = "0")
    @Mapping(target = "activeScenario", ignore = true)
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    SimulationSession toEntity(SimulationSessionCreateVm createVm);

    @Named("mapStatusToString")
    default String mapStatusToString(SimulationStatus status) {
        return status != null ? status.getValue() : null;
    }

    @Named("roundCoord")
    default Double roundCoord(Double val) {
        return val != null ? Math.round(val * 1e6) / 1e6 : null;
    }

    @Named("roundOneDecimal")
    default Double roundOneDecimal(Double val) {
        return val != null ? Math.round(val * 10.0) / 10.0 : null;
    }
}

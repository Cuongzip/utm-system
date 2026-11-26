package com.utm.simulation.mapper;

import com.utm.simulation.model.SimulationEvent;
import com.utm.simulation.model.SimulationSession;
import com.utm.simulation.model.enumeration.SimulationStatus;
import com.utm.simulation.viewmodel.session.SimulationEventVm;
import com.utm.simulation.viewmodel.session.SimulationSessionCreateVm;
import com.utm.simulation.viewmodel.session.SimulationSessionVm;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;

import java.util.List;
import java.util.Map;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE,
        builder = @org.mapstruct.Builder(disableBuilder = true)
)
public interface SimulationMapper {

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

    List<SimulationEventVm> toEventVmList(List<SimulationEvent> events);

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
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    SimulationSession toEntity(SimulationSessionCreateVm createVm);

    @Mapping(target = "id", source = "session.id")
    @Mapping(target = "flightId", source = "session.flightId")
    @Mapping(target = "missionId", source = "session.missionId")
    @Mapping(target = "droneId", source = "session.droneId")
    @Mapping(target = "flightPhase", source = "session.flightPhase")
    @Mapping(target = "tickRate", source = "session.tickRate")
    @Mapping(target = "scenarioConfig", source = "session.scenarioConfig")
    @Mapping(target = "waypoints", source = "session.waypoints")
    @Mapping(target = "totalDistance", source = "session.totalDistance")
    @Mapping(target = "version", source = "session.version")
    @Mapping(target = "createdOn", source = "session.createdOn")
    @Mapping(target = "createdBy", source = "session.createdBy")
    @Mapping(target = "lastModifiedOn", source = "session.lastModifiedOn")
    @Mapping(target = "lastModifiedBy", source = "session.lastModifiedBy")
    @Mapping(target = "status", source = "status")
    @Mapping(target = "speed", source = "speed")
    @Mapping(target = "timeScale", source = "timeScale")
    @Mapping(target = "currentLat", source = "currentLat")
    @Mapping(target = "currentLon", source = "currentLon")
    @Mapping(target = "currentAlt", source = "currentAlt")
    @Mapping(target = "currentHeading", source = "currentHeading")
    @Mapping(target = "currentBattery", source = "currentBattery")
    @Mapping(target = "progress", source = "progress")
    @Mapping(target = "traveledDistance", source = "traveledDistance")
    @Mapping(target = "currentSegment", source = "currentSegment")
    @Mapping(target = "activeScenario", source = "activeScenario")
    SimulationSession copyWithRuntime(
            SimulationSession session,
            SimulationStatus status,
            Double speed,
            Double timeScale,
            Double currentLat,
            Double currentLon,
            Double currentAlt,
            Double currentHeading,
            Double currentBattery,
            Double progress,
            Double traveledDistance,
            Integer currentSegment,
            String activeScenario);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "sessionId", source = "sessionId")
    @Mapping(target = "eventType", source = "eventType")
    @Mapping(target = "scenario", source = "scenario")
    @Mapping(target = "message", source = "message")
    @Mapping(target = "severity", expression = "java(severity != null ? severity : \"LOW\")")
    @Mapping(target = "configJson", source = "configJson")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    SimulationEvent toEventEntity(String sessionId, String eventType, String scenario, String message, String severity, Map<String, Object> configJson);

    @Named("roundCoord")
    default Double roundCoord(Double val) {
        return val != null ? Math.round(val * 1e6) / 1e6 : null;
    }

    @Named("roundOneDecimal")
    default Double roundOneDecimal(Double val) {
        return val != null ? Math.round(val * 10.0) / 10.0 : null;
    }
}


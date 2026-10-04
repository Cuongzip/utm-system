package com.utm.simulation.mapper;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.simulation.model.SimulationEvent;
import com.utm.simulation.model.SimulationSession;
import com.utm.simulation.viewmodel.SimulationEventVm;
import com.utm.simulation.viewmodel.SimulationSessionVm;
import com.utm.simulation.viewmodel.WaypointVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class SimulationMapper {

    private final ObjectMapper objectMapper;

    public SimulationSessionVm toVm(SimulationSession session) {
        if (session == null) {
            return null;
        }

        return new SimulationSessionVm(
                session.getId(),
                session.getDroneId(),
                session.getMissionId(),
                session.getDepartureHubId(),
                session.getArrivalHubId(),
                session.getStatus() != null ? session.getStatus().getValue() : null,
                session.getSpeed(),
                session.getTimeScale(),
                session.getCurrentLat() != null ? Math.round(session.getCurrentLat() * 1e6) / 1e6 : null,
                session.getCurrentLon() != null ? Math.round(session.getCurrentLon() * 1e6) / 1e6 : null,
                session.getCurrentAlt() != null ? Math.round(session.getCurrentAlt() * 10.0) / 10.0 : null,
                session.getCurrentHeading() != null ? Math.round(session.getCurrentHeading() * 10.0) / 10.0 : null,
                session.getCurrentBattery() != null ? Math.round(session.getCurrentBattery() * 10.0) / 10.0 : null,
                session.getProgress(),
                session.getTotalDistance() != null ? Math.round(session.getTotalDistance() * 10.0) / 10.0 : null,
                session.getTraveledDistance() != null ? Math.round(session.getTraveledDistance() * 10.0) / 10.0 : null,
                session.getCurrentSegment(),
                session.getTotalWaypoints(),
                session.getActiveScenario(),
                session.getCreatedOn(),
                session.getLastModifiedOn());
    }

    public SimulationEventVm toVm(SimulationEvent event) {
        if (event == null) {
            return null;
        }
        return new SimulationEventVm(
                event.getEventType(),
                event.getScenario(),
                event.getMessage(),
                event.getSeverity());
    }

    public String serializeWaypoints(List<WaypointVm> waypoints) {
        try {
            return objectMapper.writeValueAsString(waypoints);
        } catch (Exception e) {
            log.error("Failed to serialize waypoints: {}", e.getMessage());
            return "[]";
        }
    }

    public List<WaypointVm> deserializeWaypoints(String waypointsJson) {
        if (waypointsJson == null || waypointsJson.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(waypointsJson, new TypeReference<List<WaypointVm>>() {
            });
        } catch (Exception e) {
            log.error("Failed to deserialize waypoints: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}

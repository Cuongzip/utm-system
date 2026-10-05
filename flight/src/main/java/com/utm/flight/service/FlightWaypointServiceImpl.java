package com.utm.flight.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.flight.mapper.WaypointMapper;
import com.utm.flight.model.Flight;
import com.utm.flight.model.FlightWaypoint;
import com.utm.flight.model.enumeration.FlightStatus;
import com.utm.flight.repository.FlightRepository;
import com.utm.flight.repository.FlightWaypointRepository;
import com.utm.flight.viewmodel.WaypointOrderItemVm;
import com.utm.flight.viewmodel.WaypointPostVm;
import com.utm.flight.viewmodel.WaypointPutVm;
import com.utm.flight.viewmodel.WaypointReorderVm;
import com.utm.flight.viewmodel.WaypointVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class FlightWaypointServiceImpl implements FlightWaypointService {

    private final FlightRepository flightRepository;
    private final FlightWaypointRepository flightWaypointRepository;
    private final WaypointMapper waypointMapper;

    @Override
    @Transactional(readOnly = true)
    public List<WaypointVm> getFlightWaypoints(String flightId) {
        if (!flightRepository.existsById(flightId)) {
            throw new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, flightId);
        }
        return waypointMapper.toVmList(flightWaypointRepository.findByFlightIdOrderBySequenceAsc(flightId));
    }

    @Override
    @Transactional(readOnly = true)
    public WaypointVm getWaypointById(String flightId, String waypointId) {
        if (!flightRepository.existsById(flightId)) {
            throw new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, flightId);
        }
        FlightWaypoint waypoint = flightWaypointRepository.findByIdAndFlightId(waypointId, flightId)
                .orElseThrow(() -> new NotFoundException(MessageCode.WAYPOINT_NOT_FOUND, waypointId));
        return waypointMapper.toVm(waypoint);
    }

    @Override
    @Transactional
    public WaypointVm addWaypoint(String flightId, WaypointPostVm postVm) {
        Flight flight = flightRepository.findById(flightId)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, flightId));

        if (flight.getStatus() == FlightStatus.ACTIVE || flight.getStatus() == FlightStatus.COMPLETED) {
            throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE,
                    "Cannot add waypoint to an active or completed flight");
        }

        FlightWaypoint waypoint = waypointMapper.toEntity(postVm);
        waypoint.setFlight(flight);

        if (waypoint.getSequence() == null || waypoint.getSequence() <= 0) {
            int sequence = flightWaypointRepository.findTopByFlightIdOrderBySequenceDesc(flightId)
                    .map(wp -> wp.getSequence() + 1)
                    .orElse(1);
            waypoint.setSequence(sequence);
        }
        if (waypoint.getName() == null || waypoint.getName().isBlank()) {
            waypoint.setName("Waypoint " + waypoint.getSequence());
        }

        flight.addWaypoint(waypoint);
        FlightWaypoint saved = flightWaypointRepository.saveAndFlush(waypoint);
        log.info("Added waypoint ID: {} (seq: {}) to flight: {}", saved.getId(), saved.getSequence(), flightId);
        return waypointMapper.toVm(saved);
    }

    @Override
    @Transactional
    public WaypointVm updateWaypoint(String flightId, String waypointId, WaypointPutVm putVm) {
        Flight flight = flightRepository.findById(flightId)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, flightId));

        if (flight.getStatus() == FlightStatus.ACTIVE || flight.getStatus() == FlightStatus.COMPLETED) {
            throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE,
                    "Cannot update waypoint of an active or completed flight");
        }

        FlightWaypoint waypoint = flightWaypointRepository.findByIdAndFlightId(waypointId, flightId)
                .orElseThrow(() -> new NotFoundException(MessageCode.WAYPOINT_NOT_FOUND, waypointId));

        waypointMapper.updateEntityFromPutVm(waypoint, putVm);

        FlightWaypoint saved = flightWaypointRepository.saveAndFlush(waypoint);
        log.info("Updated waypoint ID: {} on flight: {}", waypointId, flightId);
        return waypointMapper.toVm(saved);
    }

    @Override
    @Transactional
    public void deleteWaypoint(String flightId, String waypointId) {
        Flight flight = flightRepository.findById(flightId)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, flightId));

        if (flight.getStatus() == FlightStatus.ACTIVE || flight.getStatus() == FlightStatus.COMPLETED) {
            throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE,
                    "Cannot delete waypoint from an active or completed flight");
        }

        FlightWaypoint waypoint = flightWaypointRepository.findByIdAndFlightId(waypointId, flightId)
                .orElseThrow(() -> new NotFoundException(MessageCode.WAYPOINT_NOT_FOUND, waypointId));

        flight.removeWaypoint(waypoint);
        flightWaypointRepository.delete(waypoint);
        flightWaypointRepository.flush();
        log.info("Deleted waypoint ID: {} from flight: {}", waypointId, flightId);
    }

    @Override
    @Transactional
    public List<WaypointVm> reorderWaypoints(String flightId, WaypointReorderVm reorderVm) {
        Flight flight = flightRepository.findById(flightId)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, flightId));

        if (flight.getStatus() == FlightStatus.ACTIVE || flight.getStatus() == FlightStatus.COMPLETED) {
            throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE,
                    "Cannot reorder waypoints of an active or completed flight");
        }

        if (reorderVm != null && reorderVm.order() != null) {
            for (WaypointOrderItemVm item : reorderVm.order()) {
                FlightWaypoint wp = flightWaypointRepository.findByIdAndFlightId(item.waypointId(), flightId)
                        .orElseThrow(() -> new NotFoundException(MessageCode.WAYPOINT_NOT_FOUND, item.waypointId()));
                wp.setSequence(item.sequence());
                flightWaypointRepository.save(wp);
            }
            flightWaypointRepository.flush();
        }

        log.info("Reordered waypoints for flight: {}", flightId);
        return waypointMapper.toVmList(flightWaypointRepository.findByFlightIdOrderBySequenceAsc(flightId));
    }
}

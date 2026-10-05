package com.utm.flight.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.flight.mapper.FlightMapper;
import com.utm.flight.mapper.WaypointMapper;
import com.utm.flight.model.Flight;
import com.utm.flight.model.FlightWaypoint;
import com.utm.flight.model.enumeration.FlightStatus;
import com.utm.flight.repository.FlightRepository;
import com.utm.flight.viewmodel.FlightAbortVm;
import com.utm.flight.viewmodel.FlightPostVm;
import com.utm.flight.viewmodel.FlightPutVm;
import com.utm.flight.viewmodel.FlightVm;
import com.utm.flight.viewmodel.HubVm;
import com.utm.flight.viewmodel.WaypointVm;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class FlightServiceImpl implements FlightService {

    private final FlightRepository flightRepository;
    private final FlightMapper flightMapper;
    private final WaypointMapper waypointMapper;
    private final DroneClientService droneClientService;
    private final HubClientService hubClientService;

    @Override
    @Transactional(readOnly = true)
    public List<FlightVm> getAllFlights(String status, String pilotId, String droneId) {
        Specification<Flight> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null && !status.isBlank()) {
                try {
                    FlightStatus flightStatus = FlightStatus.fromValue(status.trim());
                    predicates.add(cb.equal(root.get("status"), flightStatus));
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid flight status query parameter: {}", status);
                }
            }
            if (pilotId != null && !pilotId.isBlank()) {
                predicates.add(cb.equal(root.get("pilotId"), pilotId.trim()));
            }
            if (droneId != null && !droneId.isBlank()) {
                predicates.add(cb.equal(root.get("droneId"), droneId.trim()));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return flightRepository.findAll(spec).stream()
                .map(flightMapper::toVm)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public FlightVm getFlightById(String id) {
        Flight flight = flightRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, id));
        return flightMapper.toVm(flight);
    }

    @Override
    @Transactional
    public FlightVm createFlight(FlightPostVm flightPostVm) {
        String trimmedFlightNumber = flightPostVm.flightNumber() != null ? flightPostVm.flightNumber().trim() : "";
        if (flightRepository.existsByFlightNumber(trimmedFlightNumber)) {
            throw new DuplicatedException(
                    MessageCode.FLIGHT_NUMBER_ALREADY_EXISTED,
                    flightPostVm.flightNumber());
        }

        String droneId = flightPostVm.droneId().trim();
        if (!droneClientService.checkDroneExists(droneId)) {
            throw new NotFoundException(MessageCode.DRONE_NOT_FOUND, droneId);
        }

        String depHubId = flightPostVm.departureHubId().trim();
        HubVm depHub = hubClientService.getHubById(depHubId)
                .orElseThrow(() -> new NotFoundException(MessageCode.HUB_NOT_FOUND, depHubId));

        String arrHubId = flightPostVm.arrivalHubId().trim();
        HubVm arrHub = hubClientService.getHubById(arrHubId)
                .orElseThrow(() -> new NotFoundException(MessageCode.HUB_NOT_FOUND, arrHubId));

        List<WaypointVm> anchoredWaypoints = resolveAndAnchorWaypoints(flightPostVm.waypoints(), depHub, arrHub);

        Flight flight = flightMapper.toEntity(flightPostVm);
        flight.setStatus(FlightStatus.PLANNED);
        flight.setWaypoints(mapToWaypointEntities(anchoredWaypoints));

        Flight savedFlight = flightRepository.saveAndFlush(flight);

        log.info("Created new Flight plan with ID: {} and flight number: {} (total {} waypoints anchored & persisted)",
                savedFlight.getId(), savedFlight.getFlightNumber(), anchoredWaypoints.size());
        return flightMapper.toVm(savedFlight);
    }

    @Override
    @Transactional
    public FlightVm updateFlight(String id, FlightPutVm flightPutVm) {
        Flight flight = flightRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, id));

        if (flight.getStatus() == FlightStatus.ACTIVE || flight.getStatus() == FlightStatus.COMPLETED) {
            throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE,
                    "Cannot edit an active or completed flight");
        }

        if (flightPutVm.droneId() != null && !flightPutVm.droneId().isBlank()) {
            String droneId = flightPutVm.droneId().trim();
            if (!droneClientService.checkDroneExists(droneId)) {
                throw new NotFoundException(MessageCode.DRONE_NOT_FOUND, droneId);
            }
        }

        String effectiveDepHubId = (flightPutVm.departureHubId() != null && !flightPutVm.departureHubId().isBlank())
                ? flightPutVm.departureHubId().trim()
                : flight.getDepartureHubId();

        HubVm depHub = hubClientService.getHubById(effectiveDepHubId)
                .orElseThrow(() -> new NotFoundException(MessageCode.HUB_NOT_FOUND, effectiveDepHubId));

        String effectiveArrHubId = (flightPutVm.arrivalHubId() != null && !flightPutVm.arrivalHubId().isBlank())
                ? flightPutVm.arrivalHubId().trim()
                : flight.getArrivalHubId();

        HubVm arrHub = hubClientService.getHubById(effectiveArrHubId)
                .orElseThrow(() -> new NotFoundException(MessageCode.HUB_NOT_FOUND, effectiveArrHubId));

        flightMapper.updateEntityFromPutVm(flight, flightPutVm);

        if (flightPutVm.waypoints() != null) {
            List<WaypointVm> anchored = resolveAndAnchorWaypoints(flightPutVm.waypoints(), depHub, arrHub);
            flight.setWaypoints(mapToWaypointEntities(anchored));
        } else if (flightPutVm.departureHubId() != null || flightPutVm.arrivalHubId() != null) {
            List<WaypointVm> existingWaypoints = waypointMapper.toVmList(flight.getWaypoints());
            if (!existingWaypoints.isEmpty()) {
                List<WaypointVm> reAnchored = new ArrayList<>(existingWaypoints);
                if (flightPutVm.departureHubId() != null && !reAnchored.isEmpty()) {
                    reAnchored.set(0, new WaypointVm(depHub.latitude(), depHub.longitude(), depHub.altitude() != null ? depHub.altitude() : 0.0, 0.0));
                }
                if (flightPutVm.arrivalHubId() != null && !reAnchored.isEmpty()) {
                    reAnchored.set(reAnchored.size() - 1, new WaypointVm(arrHub.latitude(), arrHub.longitude(), arrHub.altitude() != null ? arrHub.altitude() : 0.0, 0.0));
                }
                flight.setWaypoints(mapToWaypointEntities(reAnchored));
            }
        }

        Flight updatedFlight = flightRepository.saveAndFlush(flight);
        log.info("Updated Flight plan with ID: {}", id);
        return flightMapper.toVm(updatedFlight);
    }

    private List<FlightWaypoint> mapToWaypointEntities(List<WaypointVm> waypoints) {
        List<FlightWaypoint> waypointEntities = new ArrayList<>();
        for (int i = 0; i < waypoints.size(); i++) {
            WaypointVm w = waypoints.get(i);
            FlightWaypoint wp = waypointMapper.toEntity(w);
            wp.setSequence(i + 1);
            if (wp.getName() == null || wp.getName().isBlank()) {
                if (i == 0) {
                    wp.setName(waypoints.size() == 1 ? "Departure / Arrival Hub" : "Departure Hub");
                } else if (i == waypoints.size() - 1) {
                    wp.setName("Arrival Hub");
                } else {
                    wp.setName("Waypoint " + (i + 1));
                }
            }
            waypointEntities.add(wp);
        }
        return waypointEntities;
    }

    @Override
    @Transactional
    public FlightVm authorizeFlight(String id) {
        Flight flight = flightRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, id));

        if (flight.getStatus() != FlightStatus.PLANNED) {
            throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE, "Only planned flights can be authorized");
        }

        flight.setStatus(FlightStatus.AUTHORIZED);
        Flight savedFlight = flightRepository.saveAndFlush(flight);
        log.info("Flight ID: {} authorized by UTM", id);
        return flightMapper.toVm(savedFlight);
    }

    @Override
    @Transactional
    public FlightVm startFlight(String id) {
        Flight flight = flightRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, id));

        if (flight.getStatus() != FlightStatus.AUTHORIZED) {
            throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE, "Only authorized flights can be started");
        }

        flight.setStatus(FlightStatus.ACTIVE);
        flight.setActualDeparture(ZonedDateTime.now());

        Flight savedFlight = flightRepository.saveAndFlush(flight);
        log.info("Flight ID: {} started (active)", id);
        return flightMapper.toVm(savedFlight);
    }

    @Override
    @Transactional
    public FlightVm completeFlight(String id) {
        Flight flight = flightRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, id));

        if (flight.getStatus() != FlightStatus.ACTIVE) {
            throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE, "Only active flights can be completed");
        }

        flight.setStatus(FlightStatus.COMPLETED);
        flight.setActualArrival(ZonedDateTime.now());

        Flight savedFlight = flightRepository.saveAndFlush(flight);
        log.info("Flight ID: {} completed successfully", id);
        return flightMapper.toVm(savedFlight);
    }

    @Override
    @Transactional
    public FlightVm abortFlight(String id, FlightAbortVm abortVm) {
        Flight flight = flightRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, id));

        if (flight.getStatus() == FlightStatus.COMPLETED) {
            throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE, "Cannot abort an already completed flight");
        }

        flight.setStatus(FlightStatus.CANCELLED);
        if (abortVm != null && abortVm.reason() != null && !abortVm.reason().isBlank()) {
            String updatedNotes = (flight.getNotes() != null ? flight.getNotes() + "\n" : "") + "Aborted reason: "
                    + abortVm.reason().trim();
            flight.setNotes(updatedNotes);
        }

        Flight savedFlight = flightRepository.saveAndFlush(flight);
        log.warn("Flight ID: {} was aborted / cancelled", id);
        return flightMapper.toVm(savedFlight);
    }

    private List<WaypointVm> resolveAndAnchorWaypoints(List<WaypointVm> inputWaypoints, HubVm depHub, HubVm arrHub) {
        WaypointVm depPoint = new WaypointVm(
                depHub.latitude(),
                depHub.longitude(),
                depHub.altitude() != null ? depHub.altitude() : 0.0,
                0.0);

        WaypointVm arrPoint = new WaypointVm(
                arrHub.latitude(),
                arrHub.longitude(),
                arrHub.altitude() != null ? arrHub.altitude() : 0.0,
                0.0);

        if (inputWaypoints == null || inputWaypoints.isEmpty()) {
            return List.of(depPoint, arrPoint);
        }

        List<WaypointVm> anchored = new ArrayList<>(inputWaypoints);

        WaypointVm first = anchored.getFirst();
        if (first.lat() == null || first.lon() == null
                || calculateDistance(first.lat(), first.lon(), depPoint.lat(), depPoint.lon()) > 30.0) {
            anchored.add(0, depPoint);
        }

        WaypointVm last = anchored.getLast();
        if (last.lat() == null || last.lon() == null
                || calculateDistance(last.lat(), last.lon(), arrPoint.lat(), arrPoint.lon()) > 30.0) {
            anchored.add(arrPoint);
        }

        return anchored;
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371000.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                        * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}

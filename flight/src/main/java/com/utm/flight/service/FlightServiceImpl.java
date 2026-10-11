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
import java.util.Objects;

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
            return cb.and(predicates.toArray(Predicate[]::new));
        };

        return flightMapper.toVmList(flightRepository.findAll(spec));
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
        flight.setAuthorizationStatus(com.utm.flight.model.enumeration.FlightAuthorizationStatus.PENDING);
        if (flightPostVm.executionId() != null && !flightPostVm.executionId().isBlank()) {
            flight.setExecutionId(flightPostVm.executionId().trim());
        }
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
                    reAnchored.set(0, new WaypointVm(depHub.latitude(), depHub.longitude(), Objects.requireNonNullElse(depHub.altitude(), 0.0), 0.0));
                }
                if (flightPutVm.arrivalHubId() != null && !reAnchored.isEmpty()) {
                    reAnchored.set(reAnchored.size() - 1, new WaypointVm(arrHub.latitude(), arrHub.longitude(), Objects.requireNonNullElse(arrHub.altitude(), 0.0), 0.0));
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

        if (flight.getStatus() != FlightStatus.PLANNED && flight.getStatus() != FlightStatus.SCHEDULED) {
            throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE, "Only planned flights can be authorized");
        }

        flight.setAuthorizationStatus(com.utm.flight.model.enumeration.FlightAuthorizationStatus.APPROVED);
        flight.setStatus(FlightStatus.AUTHORIZED);
        Flight savedFlight = flightRepository.saveAndFlush(flight);
        log.info("Flight ID: {} authorized by UTM", id);
        return flightMapper.toVm(savedFlight);
    }

    @Override
    @Transactional
    public FlightVm rejectFlight(String id, com.utm.flight.viewmodel.FlightRejectVm rejectVm) {
        Flight flight = flightRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, id));

        if (flight.getStatus() == FlightStatus.ACTIVE || flight.getStatus() == FlightStatus.COMPLETED) {
            throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE, "Cannot reject an active or completed flight");
        }

        flight.setAuthorizationStatus(com.utm.flight.model.enumeration.FlightAuthorizationStatus.REJECTED);
        flight.setStatus(FlightStatus.CANCELLED);
        if (rejectVm != null && rejectVm.reason() != null && !rejectVm.reason().isBlank()) {
            String updatedNotes = (flight.getNotes() != null ? flight.getNotes() + "\n" : "") + "Rejected reason: "
                    + rejectVm.reason().trim();
            flight.setNotes(updatedNotes);
        }

        Flight savedFlight = flightRepository.saveAndFlush(flight);
        log.warn("Flight ID: {} was rejected by ATC", id);
        return flightMapper.toVm(savedFlight);
    }

    @Override
    @Transactional
    public FlightVm startFlight(String id) {
        Flight flight = flightRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, id));

        if (flight.getAuthorizationStatus() != com.utm.flight.model.enumeration.FlightAuthorizationStatus.APPROVED
                && flight.getStatus() != FlightStatus.AUTHORIZED) {
            throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE, "Flight must be approved by ATC before takeoff");
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
        Double depLat = depHub != null ? depHub.latitude() : null;
        Double depLon = depHub != null ? depHub.longitude() : null;
        Double depAlt = depHub != null ? depHub.altitude() : 0.0;

        Double arrLat = arrHub != null ? arrHub.latitude() : null;
        Double arrLon = arrHub != null ? arrHub.longitude() : null;
        Double arrAlt = arrHub != null ? arrHub.altitude() : 0.0;

        WaypointVm depPoint = (depLat != null && depLon != null) ? new WaypointVm(depLat, depLon, depAlt, 0.0) : null;
        WaypointVm arrPoint = (arrLat != null && arrLon != null) ? new WaypointVm(arrLat, arrLon, arrAlt, 0.0) : null;

        if (inputWaypoints == null || inputWaypoints.isEmpty()) {
            List<WaypointVm> fallback = new ArrayList<>();
            if (depPoint != null) fallback.add(depPoint);
            if (arrPoint != null) fallback.add(arrPoint);
            return fallback;
        }

        List<WaypointVm> anchored = new ArrayList<>(inputWaypoints);

        if (depPoint != null) {
            WaypointVm first = anchored.getFirst();
            if (first.latitude() == null || first.longitude() == null
                    || calculateDistance(first.latitude(), first.longitude(), depPoint.latitude(), depPoint.longitude()) > 30.0) {
                anchored.add(0, depPoint);
            }
        }

        if (arrPoint != null) {
            WaypointVm last = anchored.getLast();
            if (last.latitude() == null || last.longitude() == null
                    || calculateDistance(last.latitude(), last.longitude(), arrPoint.latitude(), arrPoint.longitude()) > 30.0) {
                anchored.add(arrPoint);
            }
        }

        return anchored;
    }

    private double calculateDistance(Double lat1, Double lon1, Double lat2, Double lon2) {
        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
            return Double.MAX_VALUE;
        }
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

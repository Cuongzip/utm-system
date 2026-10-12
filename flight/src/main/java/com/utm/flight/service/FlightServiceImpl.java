package com.utm.flight.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.flight.mapper.FlightMapper;
import com.utm.flight.model.Flight;
import com.utm.flight.model.enumeration.ConformanceStatus;
import com.utm.flight.model.enumeration.FlightAuthorizationStatus;
import com.utm.flight.model.enumeration.FlightStatus;
import com.utm.flight.repository.FlightRepository;
import com.utm.flight.viewmodel.FlightAbortVm;
import com.utm.flight.viewmodel.FlightListVm;
import com.utm.flight.viewmodel.FlightPostVm;
import com.utm.flight.viewmodel.FlightPutVm;
import com.utm.flight.viewmodel.FlightRejectVm;
import com.utm.flight.viewmodel.FlightVm;
import com.utm.flight.viewmodel.GeoJsonLineStringVm;
import com.utm.flight.viewmodel.HubBriefVm;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final FlightRepository flightRepository;
    private final FlightMapper flightMapper;
    private final DroneClientService droneClientService;
    private final HubClientService hubClientService;

    @Override
    @Transactional(readOnly = true)
    public FlightListVm getFlights(String status, String authorizationStatus, String pilotId, String droneId, int limit, int offset) {
        Specification<Flight> spec = buildSpecification(status, authorizationStatus, pilotId, droneId);

        if (limit <= 0) {
            List<Flight> all = flightRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdOn"));
            return FlightListVm.of(flightMapper.toVmList(all), all.size());
        }

        int pageIndex = offset / limit;
        PageRequest pageRequest = PageRequest.of(pageIndex, limit, Sort.by(Sort.Direction.DESC, "createdOn"));
        Page<Flight> page = flightRepository.findAll(spec, pageRequest);
        return FlightListVm.of(flightMapper.toVmList(page.getContent()), page.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public List<FlightVm> getAllFlights(String status, String pilotId, String droneId) {
        Specification<Flight> spec = buildSpecification(status, null, pilotId, droneId);
        return flightMapper.toVmList(flightRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdOn")));
    }

    private Specification<Flight> buildSpecification(String status, String authorizationStatus, String pilotId, String droneId) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null && !status.isBlank()) {
                try {
                    FlightStatus flightStatus = FlightStatus.fromValue(status.trim());
                    predicates.add(cb.equal(root.get("status"), flightStatus));
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid flight status query parameter: {}", status);
                }
            }
            if (authorizationStatus != null && !authorizationStatus.isBlank()) {
                try {
                    FlightAuthorizationStatus authStatus = FlightAuthorizationStatus.fromValue(authorizationStatus.trim());
                    predicates.add(cb.equal(root.get("authorizationStatus"), authStatus));
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid authorization status query parameter: {}", authorizationStatus);
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
        HubBriefVm depHub = hubClientService.getHubById(depHubId)
                .orElseThrow(() -> new NotFoundException(MessageCode.HUB_NOT_FOUND, depHubId));

        String arrHubId = flightPostVm.arrivalHubId().trim();
        HubBriefVm arrHub = hubClientService.getHubById(arrHubId)
                .orElseThrow(() -> new NotFoundException(MessageCode.HUB_NOT_FOUND, arrHubId));

        String plannedRouteJson = buildPlannedRouteJson(flightPostVm, depHub, arrHub);

        Flight flight = flightMapper.toEntity(flightPostVm);
        flight.setPlannedRoute(plannedRouteJson);
        flight.setActualRoute("{\"type\":\"LineString\",\"coordinates\":[]}");
        flight.setStatus(FlightStatus.SCHEDULED);
        flight.setAuthorizationStatus(FlightAuthorizationStatus.PENDING);
        flight.setConformanceStatus(ConformanceStatus.CONFORMANT);

        if (flightPostVm.executionId() != null && !flightPostVm.executionId().isBlank()) {
            flight.setExecutionId(flightPostVm.executionId().trim());
        }

        Flight savedFlight = flightRepository.saveAndFlush(flight);

        log.info("Created new Flight plan ID: {} (Flight Number: {}) with GeoJSON route",
                savedFlight.getId(), savedFlight.getFlightNumber());
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

        if (flightPutVm.departureHubId() != null && !flightPutVm.departureHubId().isBlank()) {
            String depHubId = flightPutVm.departureHubId().trim();
            if (!hubClientService.checkHubExists(depHubId)) {
                throw new NotFoundException(MessageCode.HUB_NOT_FOUND, depHubId);
            }
        }

        if (flightPutVm.arrivalHubId() != null && !flightPutVm.arrivalHubId().isBlank()) {
            String arrHubId = flightPutVm.arrivalHubId().trim();
            if (!hubClientService.checkHubExists(arrHubId)) {
                throw new NotFoundException(MessageCode.HUB_NOT_FOUND, arrHubId);
            }
        }

        flightMapper.updateEntityFromPutVm(flight, flightPutVm);

        if (flightPutVm.plannedRoute() != null) {
            flight.setPlannedRoute(serializeGeoJson(flightPutVm.plannedRoute()));
        }

        if (flightPutVm.actualRoute() != null) {
            flight.setActualRoute(serializeGeoJson(flightPutVm.actualRoute()));
        }

        Flight updatedFlight = flightRepository.saveAndFlush(flight);
        log.info("Updated Flight plan with ID: {}", id);
        return flightMapper.toVm(updatedFlight);
    }

    @Override
    @Transactional
    public FlightVm authorizeFlight(String id) {
        Flight flight = flightRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, id));

        if (flight.getStatus() != FlightStatus.PLANNED && flight.getStatus() != FlightStatus.SCHEDULED) {
            throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE, "Only planned/scheduled flights can be authorized");
        }

        flight.setAuthorizationStatus(FlightAuthorizationStatus.APPROVED);
        flight.setStatus(FlightStatus.AUTHORIZED);
        Flight savedFlight = flightRepository.saveAndFlush(flight);
        log.info("Flight ID: {} authorized by ATC", id);
        return flightMapper.toVm(savedFlight);
    }

    @Override
    @Transactional
    public FlightVm rejectFlight(String id, FlightRejectVm rejectVm) {
        Flight flight = flightRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, id));

        if (flight.getStatus() == FlightStatus.ACTIVE || flight.getStatus() == FlightStatus.COMPLETED) {
            throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE, "Cannot reject an active or completed flight");
        }

        flight.setAuthorizationStatus(FlightAuthorizationStatus.REJECTED);
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

        if (flight.getAuthorizationStatus() != FlightAuthorizationStatus.APPROVED
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

    private String buildPlannedRouteJson(FlightPostVm postVm, HubBriefVm depHub, HubBriefVm arrHub) {
        if (postVm.plannedRoute() != null && postVm.plannedRoute().coordinates() != null && !postVm.plannedRoute().coordinates().isEmpty()) {
            return serializeGeoJson(postVm.plannedRoute());
        }

        List<List<Double>> fallbackCoords = new ArrayList<>();
        if (depHub != null && depHub.location() != null && depHub.location().lng() != null && depHub.location().lat() != null) {
            fallbackCoords.add(List.of(depHub.location().lng(), depHub.location().lat(), Objects.requireNonNullElse(depHub.altitudeMsl(), 0.0)));
        }
        if (arrHub != null && arrHub.location() != null && arrHub.location().lng() != null && arrHub.location().lat() != null) {
            fallbackCoords.add(List.of(arrHub.location().lng(), arrHub.location().lat(), Objects.requireNonNullElse(arrHub.altitudeMsl(), 0.0)));
        }

        return serializeGeoJson(GeoJsonLineStringVm.of(fallbackCoords));
    }

    private String serializeGeoJson(GeoJsonLineStringVm lineStringVm) {
        if (lineStringVm == null) {
            return "{\"type\":\"LineString\",\"coordinates\":[]}";
        }
        try {
            return OBJECT_MAPPER.writeValueAsString(lineStringVm);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to serialize plannedRoute GeoJSON LineString", e);
        }
    }
}

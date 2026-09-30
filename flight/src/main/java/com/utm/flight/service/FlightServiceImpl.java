package com.utm.flight.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.flight.mapper.FlightMapper;
import com.utm.flight.model.Flight;
import com.utm.flight.model.enumeration.FlightStatus;
import com.utm.flight.repository.FlightRepository;
import com.utm.flight.viewmodel.FlightAbortVm;
import com.utm.flight.viewmodel.FlightPostVm;
import com.utm.flight.viewmodel.FlightPutVm;
import com.utm.flight.viewmodel.FlightVm;
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

        // Validate drone existence
        String droneId = flightPostVm.droneId().trim();
        if (!droneClientService.checkDroneExists(droneId)) {
            throw new NotFoundException(MessageCode.DRONE_NOT_FOUND, droneId);
        }

        // Validate departure & arrival hub existence
        String depHubId = flightPostVm.departureHubId().trim();
        if (!hubClientService.checkHubExists(depHubId)) {
            throw new NotFoundException(MessageCode.HUB_NOT_FOUND, depHubId);
        }

        String arrHubId = flightPostVm.arrivalHubId().trim();
        if (!hubClientService.checkHubExists(arrHubId)) {
            throw new NotFoundException(MessageCode.HUB_NOT_FOUND, arrHubId);
        }

        Flight flight = flightMapper.toEntity(flightPostVm);
        flight.setStatus(FlightStatus.PLANNED);

        Flight savedFlight = flightRepository.saveAndFlush(flight);
        log.info("Created new Flight plan with ID: {} and flight number: {}", savedFlight.getId(), savedFlight.getFlightNumber());
        return flightMapper.toVm(savedFlight);
    }

    @Override
    @Transactional
    public FlightVm updateFlight(String id, FlightPutVm flightPutVm) {
        Flight flight = flightRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, id));

        if (flight.getStatus() == FlightStatus.ACTIVE || flight.getStatus() == FlightStatus.COMPLETED) {
            throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE, "Cannot edit an active or completed flight");
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

        Flight updatedFlight = flightRepository.saveAndFlush(flight);
        log.info("Updated Flight plan with ID: {}", id);
        return flightMapper.toVm(updatedFlight);
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

        if (flight.getStatus() != FlightStatus.AUTHORIZED && flight.getStatus() != FlightStatus.PLANNED) {
            throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE, "Flight must be authorized or planned to start");
        }

        flight.setStatus(FlightStatus.ACTIVE);
        flight.setActualDeparture(ZonedDateTime.now());

        Flight savedFlight = flightRepository.saveAndFlush(flight);
        log.info("Flight ID: {} started (ACTIVE)", id);
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
            String updatedNotes = (flight.getNotes() != null ? flight.getNotes() + "\n" : "") + "Aborted reason: " + abortVm.reason().trim();
            flight.setNotes(updatedNotes);
        }

        Flight savedFlight = flightRepository.saveAndFlush(flight);
        log.warn("Flight ID: {} was aborted / cancelled", id);
        return flightMapper.toVm(savedFlight);
    }
}

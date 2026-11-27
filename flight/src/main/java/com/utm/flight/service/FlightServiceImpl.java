package com.utm.flight.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.commonlibrary.generator.BusinessCodeGenerator;
import com.utm.commonlibrary.generator.CodePatternRule;
import com.utm.commonlibrary.kafka.event.FlightLifecycleEvent;
import com.utm.commonlibrary.utils.AuthenticationUtils;
import com.utm.flight.config.FeasibilityConfig;
import com.utm.flight.kafka.FlightEventPublisher;
import com.utm.flight.mapper.FlightMapper;
import com.utm.flight.model.Flight;
import com.utm.flight.model.GeoJsonLineString;
import com.utm.flight.model.enumeration.ConformanceStatus;
import com.utm.flight.model.enumeration.FlightAuthorizationStatus;
import com.utm.flight.model.enumeration.FlightStatus;
import com.utm.flight.model.enumeration.FlightType;
import com.utm.flight.model.enumeration.Verdict;
import com.utm.flight.repository.FlightRepository;
import com.utm.flight.service.client.AirspaceClientService;
import com.utm.flight.service.client.ConflictClientService;
import com.utm.flight.service.client.DroneClientService;
import com.utm.flight.service.client.HubClientService;
import com.utm.flight.service.client.MissionClientService;
import com.utm.flight.service.client.TelemetryClientService;
import com.utm.flight.service.client.WeatherAisClientService;
import com.utm.flight.viewmodel.client.AirspacePathCheckResultVm;
import com.utm.flight.viewmodel.client.DroneBriefVm;
import com.utm.flight.viewmodel.client.HubBriefVm;
import com.utm.flight.viewmodel.client.TelemetryBriefVm;
import com.utm.flight.viewmodel.client.TrajectoryConflictCheckResultClientVm;
import com.utm.flight.viewmodel.feasibility.DroneEnergySpecVm;
import com.utm.flight.viewmodel.feasibility.EnergyCalculationResultVm;
import com.utm.flight.viewmodel.feasibility.EnvConditionsVm;
import com.utm.flight.viewmodel.feasibility.FeasibilityCheckPostVm;
import com.utm.flight.viewmodel.feasibility.FeasibilityResultVm;
import com.utm.flight.viewmodel.feasibility.MissionProfileVm;
import com.utm.flight.viewmodel.flight.FlightAbortVm;
import com.utm.flight.viewmodel.flight.FlightListVm;
import com.utm.flight.viewmodel.flight.FlightPostVm;
import com.utm.flight.viewmodel.flight.FlightPutVm;
import com.utm.flight.viewmodel.flight.FlightRejectVm;
import com.utm.flight.viewmodel.flight.FlightVm;
import com.utm.flight.viewmodel.flight.FlightWaypointVm;
import jakarta.persistence.criteria.Predicate;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Duration;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;

@Service
@Slf4j
public class FlightServiceImpl implements FlightService {

    private static final double EARTH_RADIUS_M = 6_371_000.0;
    private static final double HUB_ANCHOR_THRESHOLD_M = 30.0;
    private static final double DEFAULT_CRUISING_ALT_AGL = 50.0;
    private static final List<FlightStatus> SCHEDULE_CONFLICT_STATUSES = List.of(
            FlightStatus.PLANNED,
            FlightStatus.SCHEDULED,
            FlightStatus.AUTHORIZED,
            FlightStatus.ACTIVE,
            FlightStatus.DIVERTED);
    private static final List<FlightStatus> CAPACITY_CONFLICT_STATUSES = List.of(
            FlightStatus.ACTIVE,
            FlightStatus.AUTHORIZED);

    private final FlightRepository flightRepository;
    private final FlightMapper flightMapper;
    private final DroneClientService droneClientService;
    private final HubClientService hubClientService;
    private final ObjectMapper objectMapper;
    private final AirspaceClientService airspaceClientService;
    private final TelemetryClientService telemetryClientService;
    private final WeatherAisClientService weatherAisClientService;
    private final FeasibilityService feasibilityService;
    private final FlightEventPublisher flightEventPublisher;
    private final MissionClientService missionClientService;
    private final ConflictClientService conflictClientService;
    private final EnergyModelService energyModelService;
    @Autowired(required = false)
    private TransactionTemplate transactionTemplate;

    public FlightServiceImpl(
            FlightRepository flightRepository,
            FlightMapper flightMapper,
            DroneClientService droneClientService,
            HubClientService hubClientService,
            ObjectMapper objectMapper,
            AirspaceClientService airspaceClientService,
            TelemetryClientService telemetryClientService,
            FeasibilityService feasibilityService,
            FlightEventPublisher flightEventPublisher
    ) {
        this(flightRepository, flightMapper, droneClientService, hubClientService, objectMapper,
                airspaceClientService, telemetryClientService, null, feasibilityService,
                flightEventPublisher, null, null, null);
    }

    public FlightServiceImpl(
            FlightRepository flightRepository,
            FlightMapper flightMapper,
            DroneClientService droneClientService,
            HubClientService hubClientService,
            ObjectMapper objectMapper,
            AirspaceClientService airspaceClientService,
            TelemetryClientService telemetryClientService,
            WeatherAisClientService weatherAisClientService,
            FeasibilityService feasibilityService,
            FlightEventPublisher flightEventPublisher
    ) {
        this(flightRepository, flightMapper, droneClientService, hubClientService, objectMapper,
                airspaceClientService, telemetryClientService, weatherAisClientService, feasibilityService,
                flightEventPublisher, null, null, null);
    }

    @Autowired
    public FlightServiceImpl(
            FlightRepository flightRepository,
            FlightMapper flightMapper,
            DroneClientService droneClientService,
            HubClientService hubClientService,
            ObjectMapper objectMapper,
            @Autowired(required = false) AirspaceClientService airspaceClientService,
            @Autowired(required = false) TelemetryClientService telemetryClientService,
            @Autowired(required = false) WeatherAisClientService weatherAisClientService,
            @Autowired(required = false) FeasibilityService feasibilityService,
            @Autowired(required = false) FlightEventPublisher flightEventPublisher,
            @Autowired(required = false) MissionClientService missionClientService,
            @Autowired(required = false) ConflictClientService conflictClientService,
            @Autowired(required = false) EnergyModelService energyModelService
    ) {
        this.flightRepository = flightRepository;
        this.flightMapper = flightMapper;
        this.droneClientService = droneClientService;
        this.hubClientService = hubClientService;
        this.objectMapper = objectMapper;
        this.airspaceClientService = airspaceClientService;
        this.telemetryClientService = telemetryClientService;
        this.weatherAisClientService = weatherAisClientService;
        this.feasibilityService = feasibilityService;
        this.flightEventPublisher = flightEventPublisher;
        this.missionClientService = missionClientService;
        this.conflictClientService = conflictClientService;
        this.energyModelService = energyModelService;
    }

    @Override
    @Transactional(readOnly = true)
    public FlightListVm getFlights(String status, String authorizationStatus, String pilotId, String droneId,
            String executionId, int limit, int offset) {
        return getFlights(status, authorizationStatus, pilotId, droneId, executionId, null, null, limit, offset);
    }

    @Override
    @Transactional(readOnly = true)
    public FlightListVm getFlights(String status, String authorizationStatus, String pilotId, String droneId,
            String executionId, String hubId, String flightType, int limit, int offset) {
        return getFlights(status, authorizationStatus, pilotId, droneId, executionId, hubId, flightType, null, null, limit, offset);
    }

    @Override
    @Transactional(readOnly = true)
    public FlightListVm getFlights(String status, String authorizationStatus, String pilotId, String droneId,
            String executionId, String hubId, String flightType, ZonedDateTime from, ZonedDateTime to,
            int limit, int offset) {
        Specification<Flight> spec = buildSpecification(
                status, authorizationStatus, pilotId, droneId, executionId, hubId, flightType, from, to);

        if (limit <= 0) {
            List<Flight> all = flightRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdOn"));
            return FlightListVm.of(flightMapper.toVmList(all), all.size());
        }

        int pageIndex = Math.max(0, offset) / limit;
        PageRequest pageRequest = PageRequest.of(pageIndex, limit, Sort.by(Sort.Direction.DESC, "createdOn"));
        Page<Flight> page = flightRepository.findAll(spec, pageRequest);
        return FlightListVm.of(flightMapper.toVmList(page.getContent()), page.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public List<FlightVm> getAllFlights(String status, String pilotId, String droneId) {
        Specification<Flight> spec = buildSpecification(status, null, pilotId, droneId, null, null, null, null, null);
        return flightMapper.toVmList(flightRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdOn")));
    }

    private Specification<Flight> buildSpecification(String status, String authorizationStatus, String pilotId,
            String droneId, String executionId, String hubId, String flightType, ZonedDateTime from, ZonedDateTime to) {
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
                    FlightAuthorizationStatus authStatus = FlightAuthorizationStatus
                            .fromValue(authorizationStatus.trim());
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
            if (executionId != null && !executionId.isBlank()) {
                predicates.add(cb.equal(root.get("executionId"), executionId.trim()));
            }
            if (hubId != null && !hubId.isBlank()) {
                String trimmedHub = hubId.trim();
                predicates.add(cb.or(
                        cb.equal(root.get("departureHubId"), trimmedHub),
                        cb.equal(root.get("arrivalHubId"), trimmedHub)));
            }
            if (flightType != null && !flightType.isBlank()) {
                try {
                    FlightType ft = FlightType.fromValue(flightType.trim());
                    predicates.add(cb.equal(root.get("flightType"), ft));
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid flightType query parameter: {}", flightType);
                }
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("scheduledDeparture"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("scheduledDeparture"), to));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    @Override
    @Transactional(readOnly = true)
    public FlightVm getFlightById(String id) {
        Flight flight = flightRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, "id", id));
        return flightMapper.toVm(flight);
    }

    @Override
    @Transactional
    public FlightVm createFlight(FlightPostVm flightPostVm) {
        validateScheduleWindow(flightPostVm.scheduledDeparture(), flightPostVm.scheduledArrival());

        String flightNumber;
        if (flightPostVm.flightNumber() != null && !flightPostVm.flightNumber().isBlank()) {
            flightNumber = flightPostVm.flightNumber().trim().toUpperCase();
            if (flightRepository.existsByFlightNumber(flightNumber)) {
                throw new DuplicatedException(
                        MessageCode.FLIGHT_NUMBER_ALREADY_EXISTED,
                        "flightNumber",
                        flightNumber);
            }
        } else {
            flightNumber = BusinessCodeGenerator.generateUnique(
                    CodePatternRule.FLIGHT_NUMBER,
                    flightRepository::existsByFlightNumber);
        }

        String droneId = flightPostVm.droneId().trim();
        if (!droneClientService.checkDroneExists(droneId)) {
            throw new NotFoundException(MessageCode.DRONE_NOT_FOUND, "id", droneId);
        }

        validateDroneScheduleAvailability(droneId, flightPostVm.scheduledDeparture(), flightPostVm.scheduledArrival(), null);

        String depHubId = flightPostVm.departureHubId().trim();
        HubBriefVm depHub = hubClientService.getHubById(depHubId)
                .orElseThrow(() -> new NotFoundException(MessageCode.HUB_NOT_FOUND, "id", depHubId));

        String arrHubId = flightPostVm.arrivalHubId().trim();
        HubBriefVm arrHub = hubClientService.getHubById(arrHubId)
                .orElseThrow(() -> new NotFoundException(MessageCode.HUB_NOT_FOUND, "id", arrHubId));

        GeoJsonLineString plannedRoute = buildPlannedRoute(flightPostVm, depHub, arrHub);

        Flight flight = flightMapper.toEntity(flightPostVm);
        flight.setFlightNumber(flightNumber);
        flight.setPlannedRoute(plannedRoute);
        flight.setActualRoute(GeoJsonLineString.empty());
        flight.setStatus(FlightStatus.SCHEDULED);
        flight.setAuthorizationStatus(FlightAuthorizationStatus.PENDING);
        flight.setConformanceStatus(ConformanceStatus.CONFORMANT);
        if (flight.getPayloadWeightKg() == null) {
            flight.setPayloadWeightKg(flightPostVm.payloadWeightKg() != null ? flightPostVm.payloadWeightKg() : 0.0);
        }
        if (flightPostVm.expectedInitialBatteryPct() != null) {
            flight.setExpectedInitialBatteryPct(flightPostVm.expectedInitialBatteryPct());
        }
        if (flight.getMinimumTurnaroundMinutes() == null) {
            flight.setMinimumTurnaroundMinutes(
                    flightPostVm.minimumTurnaroundMinutes() != null ? Math.max(0, flightPostVm.minimumTurnaroundMinutes()) : 0);
        }
        if (flightPostVm.arrivalStopoverType() != null && !flightPostVm.arrivalStopoverType().isBlank()) {
            flight.setArrivalStopoverType(flightPostVm.arrivalStopoverType().trim().toLowerCase());
        } else if (flight.getArrivalStopoverType() == null) {
            flight.setArrivalStopoverType("none");
        }

        if (flightPostVm.executionId() != null && !flightPostVm.executionId().isBlank()) {
            flight.setExecutionId(flightPostVm.executionId().trim());
        }
        if (flightPostVm.missionId() != null && !flightPostVm.missionId().isBlank()) {
            flight.setMissionId(flightPostVm.missionId().trim());
        }
        if (flightPostVm.legIndex() != null) {
            flight.setLegIndex(flightPostVm.legIndex());
        }
        if (flightPostVm.totalLegs() != null) {
            flight.setTotalLegs(flightPostVm.totalLegs());
        }
        if (flightPostVm.dependsOnFlightId() != null && !flightPostVm.dependsOnFlightId().isBlank()) {
            flight.setDependsOnFlightId(flightPostVm.dependsOnFlightId().trim());
        }

        Flight savedFlight = flightRepository.saveAndFlush(flight);
        runAutomaticPreFlightFeasibility(savedFlight, flightPostVm.waypoints());
        publishEvent(FlightLifecycleEvent.FLIGHT_CREATED, savedFlight, null, null, null);

        log.info("Created new Flight plan ID: {} (Flight Number: {}) with vertical-anchored AGL GeoJSON route",
                savedFlight.getId(), savedFlight.getFlightNumber());
        return flightMapper.toVm(savedFlight);
    }

    @Override
    @Transactional
    public FlightVm updateFlight(String id, FlightPutVm flightPutVm) {
        Flight flight = flightRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, "id", id));

        if (flight.getStatus() == FlightStatus.ACTIVE || flight.getStatus() == FlightStatus.COMPLETED
                || flight.getStatus() == FlightStatus.CANCELLED || flight.getStatus() == FlightStatus.EMERGENCY_LANDING
                || flight.getStatus() == FlightStatus.DIVERTED) {
            throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE,
                    "Cannot edit an active, completed, cancelled, diverted, or emergency landing flight");
        }

        ZonedDateTime targetDep = flightPutVm.scheduledDeparture() != null
                ? flightPutVm.scheduledDeparture()
                : flight.getScheduledDeparture();
        ZonedDateTime targetArr = flightPutVm.scheduledArrival() != null
                ? flightPutVm.scheduledArrival()
                : flight.getScheduledArrival();
        validateScheduleWindow(targetDep, targetArr);

        String targetDroneId = flight.getDroneId();
        if (flightPutVm.droneId() != null && !flightPutVm.droneId().isBlank()) {
            String droneId = flightPutVm.droneId().trim();
            if (!droneClientService.checkDroneExists(droneId)) {
                throw new NotFoundException(MessageCode.DRONE_NOT_FOUND, "id", droneId);
            }
            targetDroneId = droneId;
        }

        if (flightPutVm.droneId() != null || flightPutVm.scheduledDeparture() != null || flightPutVm.scheduledArrival() != null) {
            validateDroneScheduleAvailability(targetDroneId, targetDep, targetArr, flight.getId());
        }

        if (flightPutVm.departureHubId() != null && !flightPutVm.departureHubId().isBlank()) {
            String depHubId = flightPutVm.departureHubId().trim();
            if (!hubClientService.checkHubExists(depHubId)) {
                throw new NotFoundException(MessageCode.HUB_NOT_FOUND, "id", depHubId);
            }
        }

        if (flightPutVm.arrivalHubId() != null && !flightPutVm.arrivalHubId().isBlank()) {
            String arrHubId = flightPutVm.arrivalHubId().trim();
            if (!hubClientService.checkHubExists(arrHubId)) {
                throw new NotFoundException(MessageCode.HUB_NOT_FOUND, "id", arrHubId);
            }
        }

        flightMapper.updateEntityFromPutVm(flight, flightPutVm);

        if (flightPutVm.plannedRoute() != null) {
            flight.setPlannedRoute(GeoJsonLineString.of(flightPutVm.plannedRoute().coordinates()));
        } else if (flightPutVm.waypoints() != null && flightPutVm.waypoints().size() >= 2) {
            HubBriefVm depHub = hubClientService.getHubById(flight.getDepartureHubId()).orElse(null);
            HubBriefVm arrHub = hubClientService.getHubById(flight.getArrivalHubId()).orElse(null);
            List<List<Double>> anchored = anchorWaypointsWithHubs(
                    flightPutVm.waypoints(), depHub, arrHub, flight.getCruisingAltitudeM());
            if (anchored.size() >= 2) {
                flight.setPlannedRoute(GeoJsonLineString.of(anchored));
            }
        } else if (flightPutVm.departureHubId() != null || flightPutVm.arrivalHubId() != null) {
            HubBriefVm depHub = hubClientService.getHubById(flight.getDepartureHubId()).orElse(null);
            HubBriefVm arrHub = hubClientService.getHubById(flight.getArrivalHubId()).orElse(null);
            List<FlightWaypointVm> existingWps = flight.getWaypoints() != null
                    ? flightMapper.toWaypointVms(flight.getWaypoints())
                    : List.of();
            List<List<Double>> anchored = anchorWaypointsWithHubs(
                    existingWps != null ? existingWps : List.of(), depHub, arrHub, flight.getCruisingAltitudeM());
            if (anchored.size() >= 2) {
                flight.setPlannedRoute(GeoJsonLineString.of(anchored));
            }
        }

        if (flightPutVm.actualRoute() != null) {
            flight.setActualRoute(GeoJsonLineString.of(flightPutVm.actualRoute().coordinates()));
        }

        if (flight.getStatus() == FlightStatus.AUTHORIZED) {
            flight.setStatus(FlightStatus.SCHEDULED);
            flight.setAuthorizationStatus(FlightAuthorizationStatus.PENDING);
            log.info("Flight {} was modified after authorization; resetting to SCHEDULED/PENDING", id);
        }

        Flight updatedFlight = flightRepository.saveAndFlush(flight);
        boolean impactsFeasibility = flightPutVm.droneId() != null
                || flightPutVm.waypoints() != null
                || flightPutVm.plannedRoute() != null
                || flightPutVm.departureHubId() != null
                || flightPutVm.arrivalHubId() != null
                || flightPutVm.expectedInitialBatteryPct() != null;
        if (impactsFeasibility) {
            runAutomaticPreFlightFeasibility(updatedFlight, flightPutVm.waypoints());
        }
        publishEvent(FlightLifecycleEvent.FLIGHT_UPDATED, updatedFlight, null, null, null);
        log.info("Updated Flight plan with ID: {}", id);
        return flightMapper.toVm(updatedFlight);
    }

    @Override
    @Transactional
    public FlightVm authorizeFlight(String id) {
        Flight flight = flightRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, "id", id));

        if ((flight.getStatus() != FlightStatus.PLANNED && flight.getStatus() != FlightStatus.SCHEDULED)
                || flight.getAuthorizationStatus() != FlightAuthorizationStatus.PENDING) {
            throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE,
                    "Only planned/scheduled flights with pending authorization can be authorized");
        }

        boolean hasOverride = flight.getFeasibilityOverride() != null && !flight.getFeasibilityOverride().isBlank();
        if (flight.getFeasibilityVerdict() == Verdict.NO_GO && !hasOverride) {
            throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE,
                    "Cannot authorize flight with NO_GO feasibility verdict without an approved feasibility override");
        }

        if (!hasOverride) {
            validateAirspaceCompliance(flight);
            validateStrategicTrajectoryDeconfliction(flight);
        }
        validateHubCapacity(flight, flight.getDepartureHubId(), true);
        validateHubCapacity(flight, flight.getArrivalHubId(), false);

        flight.setAuthorizationStatus(FlightAuthorizationStatus.APPROVED);
        flight.setStatus(FlightStatus.AUTHORIZED);
        if (flight.getAuthorizationNumber() == null || flight.getAuthorizationNumber().isBlank()) {
            flight.setAuthorizationNumber(BusinessCodeGenerator.generateUnique(
                    new CodePatternRule("AUTH", "yyyyMMdd", 4, "-"),
                    flightRepository::existsByAuthorizationNumber));
        }
        try {
            flight.setAuthorizedBy(AuthenticationUtils.extractUserId());
        } catch (Exception ignored) {
            flight.setAuthorizedBy("ATC");
        }
        flight.setAuthorizedAt(ZonedDateTime.now());
        if (weatherAisClientService != null && flight.getDepartureHubId() != null) {
            weatherAisClientService.getWeatherGoNoGo(flight.getDepartureHubId()).ifPresent(w -> {
                java.util.Map<String, Object> snap = new java.util.LinkedHashMap<>();
                snap.put("verdict", w.verdict());
                snap.put("windSpeedMs", w.windSpeedMs());
                snap.put("windGustMs", w.windGustMs());
                snap.put("visibilityM", w.visibilityM());
                snap.put("flightCategory", w.flightCategory());
                snap.put("nearestStation", w.nearestStation());
                flight.setWeatherConditions(snap);
            });
        }
        Flight savedFlight = flightRepository.saveAndFlush(flight);
        publishEvent(FlightLifecycleEvent.FLIGHT_AUTHORIZED, savedFlight, null, null, null);
        log.info("Flight ID: {} authorized by ATC", id);
        return flightMapper.toVm(savedFlight);
    }

    @Override
    @Transactional
    public FlightVm rejectFlight(String id, FlightRejectVm rejectVm) {
        Flight flight = flightRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, "id", id));

        if ((flight.getStatus() != FlightStatus.PLANNED && flight.getStatus() != FlightStatus.SCHEDULED
                && flight.getStatus() != FlightStatus.AUTHORIZED)
                || flight.getAuthorizationStatus() == FlightAuthorizationStatus.REJECTED) {
            throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE,
                    "Cannot reject a flight that is active, completed, cancelled, or already rejected");
        }

        flight.setAuthorizationStatus(FlightAuthorizationStatus.REJECTED);
        flight.setStatus(FlightStatus.CANCELLED);
        String reason = null;
        if (rejectVm != null && rejectVm.reason() != null && !rejectVm.reason().isBlank()) {
            reason = rejectVm.reason().trim();
            String updatedNotes = (flight.getNotes() != null ? flight.getNotes() + "\n" : "") + "Rejected reason: "
                    + reason;
            flight.setNotes(updatedNotes);
        }

        Flight savedFlight = flightRepository.saveAndFlush(flight);
        publishEvent(FlightLifecycleEvent.FLIGHT_REJECTED, savedFlight, null, null, reason);
        log.warn("Flight ID: {} was rejected by ATC", id);
        return flightMapper.toVm(savedFlight);
    }

    @Override
    public FlightVm startFlight(String id) {
        Flight flight = flightRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, "id", id));

        if (flight.getStatus() != FlightStatus.AUTHORIZED
                || flight.getAuthorizationStatus() != FlightAuthorizationStatus.APPROVED) {
            throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE,
                    "Flight must be in AUTHORIZED status and APPROVED by ATC before takeoff");
        }

        // Gate 1: Block takeoff if parent MissionExecution is PAUSED / ABORTED / FAILED
        if (flight.getExecutionId() != null && !flight.getExecutionId().isBlank() && missionClientService != null) {
            Optional<String> execStatusOpt = missionClientService.getExecutionStatus(flight.getExecutionId());
            if (execStatusOpt.isPresent()) {
                String execStatus = execStatusOpt.get().trim().toLowerCase();
                if ("paused".equals(execStatus) || "aborted".equals(execStatus) || "failed".equals(execStatus)) {
                    throw new BadRequestException(MessageCode.MISSION_EXECUTION_PAUSED,
                            "executionId", flight.getExecutionId(),
                            "status", execStatus);
                }
            }
        }

        Flight prevFlight = null;
        if (flight.getDependsOnFlightId() != null && !flight.getDependsOnFlightId().isBlank()) {
            String prevFlightId = flight.getDependsOnFlightId().trim();
            prevFlight = flightRepository.findById(prevFlightId).orElse(null);
            if (prevFlight == null || prevFlight.getStatus() != FlightStatus.COMPLETED) {
                throw new BadRequestException(MessageCode.PREVIOUS_LEG_NOT_COMPLETED,
                        "dependsOnFlightId", prevFlightId);
            }
        }

        Optional<DroneBriefVm> droneOpt = droneClientService.getDroneById(flight.getDroneId());

        // Gate 2: Ground turnaround time check for consecutive legs using the same drone
        int minTurnaroundMin = flight.getMinimumTurnaroundMinutes() != null ? flight.getMinimumTurnaroundMinutes() : 0;
        if (prevFlight != null && minTurnaroundMin > 0
                && Objects.equals(prevFlight.getDroneId(), flight.getDroneId())
                && prevFlight.getActualArrival() != null) {
            long elapsedMin = Math.max(0L, Duration.between(prevFlight.getActualArrival(), ZonedDateTime.now()).toMinutes());
            if (elapsedMin < minTurnaroundMin) {
                throw new BadRequestException(MessageCode.TURNAROUND_TIME_NOT_ELAPSED,
                        "requiredMinutes", String.valueOf(minTurnaroundMin),
                        "elapsedMinutes", String.valueOf(elapsedMin));
            }
        }

        // Gate 3: Live drone availability, hub location, and real current battery sufficiency
        if (droneOpt.isPresent()) {
            DroneBriefVm drone = droneOpt.get();
            boolean blockedByOtherFlight = "in_flight".equalsIgnoreCase(drone.status())
                    && flightRepository.findByDroneId(flight.getDroneId()).stream()
                            .anyMatch(other -> other != null
                                    && !Objects.equals(other.getId(), flight.getId())
                                    && (other.getStatus() == FlightStatus.ACTIVE
                                            || other.getStatus() == FlightStatus.DIVERTED));
            if (drone.status() != null && (blockedByOtherFlight
                    || "charging".equalsIgnoreCase(drone.status())
                    || "maintenance".equalsIgnoreCase(drone.status())
                    || "offline".equalsIgnoreCase(drone.status())
                    || "retired".equalsIgnoreCase(drone.status()))) {
                throw new BadRequestException(MessageCode.DRONE_NOT_AVAILABLE,
                        java.util.Map.of(
                                "droneId", flight.getDroneId(),
                                "registrationNumber", drone.registrationNumber() != null ? drone.registrationNumber() : flight.getDroneId()));
            }
            if (drone.currentHubId() != null && !drone.currentHubId().isBlank()
                    && flight.getDepartureHubId() != null && !flight.getDepartureHubId().isBlank()
                    && !drone.currentHubId().equals(flight.getDepartureHubId())) {
                throw new BadRequestException(MessageCode.DRONE_NOT_AT_DEPARTURE_HUB,
                        "droneHubId", drone.currentHubId(),
                        "departureHubId", flight.getDepartureHubId());
            }

            boolean hasOverride = flight.getFeasibilityOverride() != null && !flight.getFeasibilityOverride().isBlank();
            if (!hasOverride && drone.currentBatteryPct() != null && drone.batteryCapacityWh() != null
                    && flight.getPlannedRoute() != null && flight.getPlannedRoute().coordinates() != null
                    && flight.getPlannedRoute().coordinates().size() >= 2) {
                validateLiveBatteryForTakeoff(flight, drone);
            }
        }

        Flight savedFlight = runFlightMutation(id, flight, target -> {
            if (target.getStatus() != FlightStatus.AUTHORIZED
                    || target.getAuthorizationStatus() != FlightAuthorizationStatus.APPROVED) {
                throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE,
                        "Flight must be in AUTHORIZED status and APPROVED by ATC before takeoff");
            }
            target.setStatus(FlightStatus.ACTIVE);
            target.setActualDeparture(ZonedDateTime.now());
            return flightRepository.saveAndFlush(target);
        });
        publishEvent(FlightLifecycleEvent.FLIGHT_STARTED, savedFlight, null, null, null);
        log.info("Flight ID: {} started (active)", id);
        return flightMapper.toVm(savedFlight);
    }

    @Override
    public FlightVm completeFlight(String id) {
        return completeFlight(id, null);
    }

    @Override
    public FlightVm completeFlight(String id, String landingHubId) {
        Flight flight = flightRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, "id", id));

        if (flight.getStatus() != FlightStatus.ACTIVE && flight.getStatus() != FlightStatus.DIVERTED) {
            throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE, "Only active flights can be completed");
        }

        String trimmedLandingHub = (landingHubId != null && !landingHubId.isBlank()) ? landingHubId.trim() : null;
        TelemetryCompletionSnapshot snapshot = fetchTelemetryCompletionSnapshot(flight);
        Flight savedFlight = runFlightMutation(id, flight, target -> {
            if (target.getStatus() != FlightStatus.ACTIVE && target.getStatus() != FlightStatus.DIVERTED) {
                throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE, "Only active flights can be completed");
            }
            applyTelemetrySnapshot(target, snapshot);
            target.setStatus(FlightStatus.COMPLETED);
            target.setActualArrival(ZonedDateTime.now());
            if (trimmedLandingHub != null && Objects.equals(trimmedLandingHub, target.getDepartureHubId())
                    && !Objects.equals(trimmedLandingHub, target.getArrivalHubId())) {
                String updatedNotes = (target.getNotes() != null ? target.getNotes() + "\n" : "")
                        + "Completed return-to-home landing at departure hub";
                target.setNotes(updatedNotes);
            }
            return flightRepository.saveAndFlush(target);
        });
        String effectiveLandingHub = trimmedLandingHub != null ? trimmedLandingHub : savedFlight.getArrivalHubId();
        publishEvent(FlightLifecycleEvent.FLIGHT_COMPLETED, savedFlight, effectiveLandingHub, null, null);
        if (conflictClientService != null) {
            conflictClientService.resolveConformanceConflicts(id, "Flight completed at hub " + effectiveLandingHub);
        }
        log.info("Flight ID: {} completed successfully at hub={} (endingBatteryPct={})",
                id, effectiveLandingHub, savedFlight.getEndingBatteryPct());
        return flightMapper.toVm(savedFlight);
    }

    @Override
    public FlightVm abortFlight(String id, FlightAbortVm abortVm) {
        Flight flight = flightRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, "id", id));

        if (flight.getStatus() == FlightStatus.COMPLETED || flight.getStatus() == FlightStatus.CANCELLED
                || flight.getStatus() == FlightStatus.EMERGENCY_LANDING) {
            throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE,
                    "Cannot abort a completed, cancelled, or already emergency landing flight");
        }

        boolean wasAirborneSnapshot = flight.getStatus() == FlightStatus.ACTIVE || flight.getStatus() == FlightStatus.DIVERTED;
        TelemetryCompletionSnapshot snapshot = wasAirborneSnapshot
                ? fetchTelemetryCompletionSnapshot(flight)
                : new TelemetryCompletionSnapshot(null, null);

        String trimmedReason = (abortVm != null && abortVm.reason() != null && !abortVm.reason().isBlank())
                ? abortVm.reason().trim()
                : null;

        Flight savedFlight = runFlightMutation(id, flight, target -> {
            if (target.getStatus() == FlightStatus.COMPLETED || target.getStatus() == FlightStatus.CANCELLED
                    || target.getStatus() == FlightStatus.EMERGENCY_LANDING) {
                throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE,
                        "Cannot abort a completed, cancelled, or already emergency landing flight");
            }
            boolean airborneNow = target.getStatus() == FlightStatus.ACTIVE || target.getStatus() == FlightStatus.DIVERTED;
            if (airborneNow) {
                applyTelemetrySnapshot(target, snapshot);
                target.setStatus(FlightStatus.EMERGENCY_LANDING);
                target.setActualArrival(ZonedDateTime.now());
            } else {
                target.setStatus(FlightStatus.CANCELLED);
            }
            if (trimmedReason != null) {
                String updatedNotes = (target.getNotes() != null ? target.getNotes() + "\n" : "") + "Aborted reason: "
                        + trimmedReason;
                target.setNotes(updatedNotes);
            }
            return flightRepository.saveAndFlush(target);
        });
        String eventType = savedFlight.getStatus() == FlightStatus.EMERGENCY_LANDING
                ? FlightLifecycleEvent.FLIGHT_EMERGENCY_LANDING
                : FlightLifecycleEvent.FLIGHT_CANCELLED;
        publishEvent(eventType, savedFlight, null, null, trimmedReason);
        if (conflictClientService != null) {
            conflictClientService.resolveConformanceConflicts(id,
                    "Flight terminated (" + savedFlight.getStatus().getValue() + ")");
        }
        log.warn("Flight ID: {} was aborted / cancelled (status: {})", id, savedFlight.getStatus());
        return flightMapper.toVm(savedFlight);
    }

    @Override
    public FlightVm divertFlight(String id, String targetHubId, String reason) {
        Flight flight = flightRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, "id", id));

        if (flight.getStatus() != FlightStatus.ACTIVE && flight.getStatus() != FlightStatus.DIVERTED) {
            throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE,
                    "Only active or diverted flights can be diverted");
        }

        String trimmedHubId = (targetHubId != null && !targetHubId.isBlank()) ? targetHubId.trim() : null;
        Optional<HubBriefVm> divertHubOpt = Optional.empty();
        if (trimmedHubId != null && hubClientService != null) {
            try {
                divertHubOpt = hubClientService.getHubById(trimmedHubId);
            } catch (Exception ex) {
                log.warn("Could not enrich diversion route coordinates for hub {}: {}", trimmedHubId, ex.getMessage());
            }
        }
        Optional<HubBriefVm> resolvedDivertHub = divertHubOpt;

        Flight savedFlight = runFlightMutation(id, flight, target -> {
            if (target.getStatus() != FlightStatus.ACTIVE && target.getStatus() != FlightStatus.DIVERTED) {
                throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE,
                        "Only active or diverted flights can be diverted");
            }
            if (trimmedHubId != null) {
                target.setArrivalHubId(trimmedHubId);
                resolvedDivertHub.ifPresent(divertHub -> {
                    if (hasValidCoordinates(divertHub)) {
                        double cruiseAlt = target.getCruisingAltitudeM() != null && target.getCruisingAltitudeM() > 0
                                ? target.getCruisingAltitudeM()
                                : DEFAULT_CRUISING_ALT_AGL;
                        List<List<Double>> existingCoords = parseRouteCoordinates(target.getPlannedRoute());
                        List<List<Double>> updatedCoords = new ArrayList<>(existingCoords);
                        List<Double> approachPoint = List.of(divertHub.location().lng(), divertHub.location().lat(), cruiseAlt);
                        List<Double> touchdownPoint = List.of(divertHub.location().lng(), divertHub.location().lat(), 0.0);
                        if (updatedCoords.size() >= 2) {
                            updatedCoords.set(updatedCoords.size() - 1, approachPoint);
                            updatedCoords.add(touchdownPoint);
                        } else {
                            updatedCoords.add(approachPoint);
                            updatedCoords.add(touchdownPoint);
                        }
                        target.setPlannedRoute(GeoJsonLineString.of(updatedCoords));
                    }
                });
            }
            target.setStatus(FlightStatus.DIVERTED);
            target.setConformanceStatus(ConformanceStatus.CONFORMANT);
            if (reason != null && !reason.isBlank()) {
                String updatedNotes = (target.getNotes() != null ? target.getNotes() + "\n" : "")
                        + "Diverted: " + reason.trim();
                target.setNotes(updatedNotes);
            }
            return flightRepository.saveAndFlush(target);
        });
        publishEvent(FlightLifecycleEvent.FLIGHT_DIVERTED, savedFlight, savedFlight.getArrivalHubId(), null, reason);
        if (conflictClientService != null) {
            conflictClientService.resolveConformanceConflicts(id, "Flight diverted along updated corridor");
        }
        log.warn("Flight ID: {} diverted to hub {}", id, savedFlight.getArrivalHubId());
        return flightMapper.toVm(savedFlight);
    }

    @Override
    public FlightVm returnToHome(String id, String reason) {
        Flight flight = flightRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, "id", id));

        if (flight.getStatus() != FlightStatus.ACTIVE && flight.getStatus() != FlightStatus.DIVERTED) {
            return flightMapper.toVm(flight);
        }

        Optional<TelemetryBriefVm> latestTel = telemetryClientService != null
                ? telemetryClientService.getLatestFlightTelemetry(id)
                : Optional.empty();
        Optional<HubBriefVm> depHubOpt = Optional.empty();
        if (flight.getDepartureHubId() != null && !flight.getDepartureHubId().isBlank() && hubClientService != null) {
            try {
                depHubOpt = hubClientService.getHubById(flight.getDepartureHubId().trim());
            } catch (Exception ex) {
                log.debug("Could not fetch departure hub {} for RTH corridor: {}", flight.getDepartureHubId(), ex.getMessage());
            }
        }
        Optional<HubBriefVm> resolvedDepHub = depHubOpt;

        Flight savedFlight = runFlightMutation(id, flight, target -> {
            if (target.getStatus() != FlightStatus.ACTIVE && target.getStatus() != FlightStatus.DIVERTED) {
                return target;
            }
            List<List<Double>> existingCoords = parseRouteCoordinates(target.getPlannedRoute());
            double baseCruiseAlt = target.getCruisingAltitudeM() != null && target.getCruisingAltitudeM() > 0
                    ? target.getCruisingAltitudeM()
                    : DEFAULT_CRUISING_ALT_AGL;

            Double depLat = null;
            Double depLon = null;
            if (resolvedDepHub.isPresent() && hasValidCoordinates(resolvedDepHub.get())) {
                depLat = resolvedDepHub.get().location().lat();
                depLon = resolvedDepHub.get().location().lng();
            } else if (!existingCoords.isEmpty() && existingCoords.getFirst().size() >= 2) {
                depLon = existingCoords.getFirst().get(0);
                depLat = existingCoords.getFirst().get(1);
            }

            Double curLat = latestTel.map(TelemetryBriefVm::latitude).orElse(depLat);
            Double curLon = latestTel.map(TelemetryBriefVm::longitude).orElse(depLon);
            double curAlt = latestTel.map(TelemetryBriefVm::altitude).filter(a -> a > 0.0).orElse(baseCruiseAlt);
            double safeRtlAlt = Math.max(curAlt, Math.max(baseCruiseAlt, 40.0));

            if (depLat != null && depLon != null && curLat != null && curLon != null) {
                List<List<Double>> rthCoords = new ArrayList<>();
                rthCoords.add(List.of(curLon, curLat, safeRtlAlt));
                rthCoords.add(List.of(depLon, depLat, safeRtlAlt));
                rthCoords.add(List.of(depLon, depLat, 0.0));
                target.setPlannedRoute(GeoJsonLineString.of(rthCoords));
            }
            target.setStatus(FlightStatus.DIVERTED);
            target.setConformanceStatus(ConformanceStatus.CONFORMANT);
            if (reason != null && !reason.isBlank()) {
                String updatedNotes = (target.getNotes() != null ? target.getNotes() + "\n" : "")
                        + "RTH initiated: " + reason.trim();
                target.setNotes(updatedNotes);
            }
            return flightRepository.saveAndFlush(target);
        });
        publishEvent(FlightLifecycleEvent.FLIGHT_DIVERTED, savedFlight, savedFlight.getDepartureHubId(), null,
                reason != null ? reason : "Return-to-home command initiated");
        if (conflictClientService != null) {
            conflictClientService.resolveConformanceConflicts(id, "Flight executing authorized RTH corridor to departure hub");
        }
        log.info("Flight ID: {} transitioned to RTH corridor toward departure hub {}", id, savedFlight.getDepartureHubId());
        return flightMapper.toVm(savedFlight);
    }

    @Override
    public FlightVm resumePlannedRoute(String id) {
        Flight flight = flightRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, "id", id));

        if (flight.getStatus() != FlightStatus.DIVERTED) {
            return flightMapper.toVm(flight);
        }

        Optional<TelemetryBriefVm> latestTel = telemetryClientService != null
                ? telemetryClientService.getLatestFlightTelemetry(id)
                : Optional.empty();
        Optional<HubBriefVm> arrHubOpt = Optional.empty();
        if (flight.getArrivalHubId() != null && !flight.getArrivalHubId().isBlank() && hubClientService != null) {
            try {
                arrHubOpt = hubClientService.getHubById(flight.getArrivalHubId().trim());
            } catch (Exception ex) {
                log.debug("Could not fetch arrival hub {} on RESUME: {}", flight.getArrivalHubId(), ex.getMessage());
            }
        }
        Optional<HubBriefVm> resolvedArrHub = arrHubOpt;

        Flight savedFlight = runFlightMutation(id, flight, target -> {
            if (target.getStatus() != FlightStatus.DIVERTED) {
                return target;
            }
            double cruiseAlt = target.getCruisingAltitudeM() != null && target.getCruisingAltitudeM() > 0
                    ? target.getCruisingAltitudeM()
                    : DEFAULT_CRUISING_ALT_AGL;
            List<List<Double>> resumedCoords = new ArrayList<>();
            latestTel.ifPresent(tel -> {
                if (tel.latitude() != null && tel.longitude() != null) {
                    resumedCoords.add(List.of(tel.longitude(), tel.latitude(),
                            tel.altitude() != null && tel.altitude() > 0 ? tel.altitude() : cruiseAlt));
                }
            });
            if (target.getWaypoints() != null) {
                for (var wp : target.getWaypoints()) {
                    if (wp != null && wp.latitude() != null && wp.longitude() != null) {
                        resumedCoords.add(List.of(wp.longitude(), wp.latitude(),
                                wp.altitude() != null && wp.altitude() > 0 ? wp.altitude() : cruiseAlt));
                    }
                }
            }
            resolvedArrHub.ifPresent(arrHub -> {
                if (hasValidCoordinates(arrHub)) {
                    resumedCoords.add(List.of(arrHub.location().lng(), arrHub.location().lat(), cruiseAlt));
                }
            });
            if (resumedCoords.size() >= 2) {
                target.setPlannedRoute(GeoJsonLineString.of(resumedCoords));
            }
            target.setStatus(FlightStatus.ACTIVE);
            target.setConformanceStatus(ConformanceStatus.CONFORMANT);
            return flightRepository.saveAndFlush(target);
        });
        if (conflictClientService != null) {
            conflictClientService.resolveConformanceConflicts(id, "Flight resumed planned corridor");
        }
        log.info("Flight ID: {} resumed ACTIVE planned trajectory", id);
        return flightMapper.toVm(savedFlight);
    }

    private void validateLiveBatteryForTakeoff(Flight flight, DroneBriefVm drone) {
        double distanceM = calculateRouteHorizontalDistance(flight.getPlannedRoute());
        if (distanceM <= 0.0) {
            return;
        }
        double hoverSec = 0.0;
        if (flight.getWaypoints() != null) {
            for (var wp : flight.getWaypoints()) {
                if (wp != null && wp.hoverDurationSec() != null && wp.hoverDurationSec() > 0) {
                    hoverSec += wp.hoverDurationSec();
                }
            }
        }
        double payloadKg = flight.getPayloadWeightKg() != null ? flight.getPayloadWeightKg() : 0.0;

        if (energyModelService != null) {
            DroneEnergySpecVm spec = new DroneEnergySpecVm(
                    drone.batteryCapacityWh(),
                    drone.hoverPowerW(),
                    drone.cruisePowerW(),
                    drone.cruiseSpeedMs(),
                    drone.batteryHealthPct(),
                    drone.windToleranceMs(),
                    drone.maxPayload(),
                    drone.maxFlightTimeMin(),
                    drone.currentBatteryPct());
            EnergyCalculationResultVm calc = energyModelService.calculateEnergy(
                    spec, new MissionProfileVm(distanceM, hoverSec, payloadKg), new EnvConditionsVm(null));
            if (calc.usableWh() < calc.requiredWh()) {
                throw new BadRequestException(MessageCode.INSUFFICIENT_BATTERY_FOR_FLIGHT,
                        "currentBatteryPct", String.format("%.1f%%", drone.currentBatteryPct()),
                        "usableWh", String.format("%.1f", calc.usableWh()),
                        "requiredWh", String.format("%.1f", calc.requiredWh()));
            }
        } else {
            double healthPct = drone.batteryHealthPct() != null ? drone.batteryHealthPct() : 100.0;
            double usableWh = drone.batteryCapacityWh() * (drone.currentBatteryPct() / 100.0)
                    * (healthPct / 100.0) * (1.0 - FeasibilityConfig.RESERVE_FRACTION);
            double cruisePowerW = drone.cruisePowerW() != null && drone.cruisePowerW() > 0
                    ? drone.cruisePowerW()
                    : FeasibilityConfig.DEFAULT_CRUISE_POWER_W;
            double cruiseSpeedMs = drone.cruiseSpeedMs() != null && drone.cruiseSpeedMs() > 0
                    ? drone.cruiseSpeedMs()
                    : FeasibilityConfig.DEFAULT_CRUISE_SPEED_MS;
            double maxPayload = drone.maxPayload() != null && drone.maxPayload() > 0
                    ? drone.maxPayload()
                    : FeasibilityConfig.DEFAULT_MAX_PAYLOAD_KG;
            double payloadFactor = 1.0 + FeasibilityConfig.K_PAYLOAD * (payloadKg / maxPayload);
            double requiredWh = cruisePowerW * ((distanceM / cruiseSpeedMs) / 3600.0) * payloadFactor
                    * (1.0 + FeasibilityConfig.CLIMB_SURCHARGE);
            if (usableWh < requiredWh) {
                throw new BadRequestException(MessageCode.INSUFFICIENT_BATTERY_FOR_FLIGHT,
                        "currentBatteryPct", String.format("%.1f%%", drone.currentBatteryPct()),
                        "usableWh", String.format("%.1f", usableWh),
                        "requiredWh", String.format("%.1f", requiredWh));
            }
        }
    }

    private double calculateRouteHorizontalDistance(GeoJsonLineString route) {
        if (route == null || route.coordinates() == null || route.coordinates().size() < 2) {
            return 0.0;
        }
        double total = 0.0;
        List<List<Double>> coords = route.coordinates();
        for (int i = 0; i < coords.size() - 1; i++) {
            List<Double> p1 = coords.get(i);
            List<Double> p2 = coords.get(i + 1);
            if (p1 != null && p2 != null && p1.size() >= 2 && p2.size() >= 2) {
                total += haversineMeters(p1.get(1), p1.get(0), p2.get(1), p2.get(0));
            }
        }
        return total;
    }

    private void validateScheduleWindow(ZonedDateTime scheduledDeparture, ZonedDateTime scheduledArrival) {
        if (scheduledDeparture != null && scheduledArrival != null && !scheduledArrival.isAfter(scheduledDeparture)) {
            throw new BadRequestException(MessageCode.INVALID_FLIGHT_SCHEDULE);
        }
    }

    private void validateDroneScheduleAvailability(
            String droneId,
            ZonedDateTime scheduledDeparture,
            ZonedDateTime scheduledArrival,
            String excludeFlightId
    ) {
        if (droneId == null || scheduledDeparture == null || scheduledArrival == null) {
            return;
        }
        List<Flight> overlapping = flightRepository.findOverlappingFlights(
                droneId, SCHEDULE_CONFLICT_STATUSES, scheduledDeparture, scheduledArrival, excludeFlightId);
        if (overlapping != null && !overlapping.isEmpty()) {
            throw new BadRequestException(MessageCode.DRONE_SCHEDULE_CONFLICT, "droneId", droneId);
        }
    }

    private void validateAirspaceCompliance(Flight flight) {
        if (airspaceClientService == null || flight.getPlannedRoute() == null) {
            return;
        }
        List<List<Double>> coords = parseRouteCoordinates(flight.getPlannedRoute());
        if (coords.size() < 2) {
            return;
        }
        AirspacePathCheckResultVm result = airspaceClientService.checkPath(coords, flight.getCruisingAltitudeM());
        if (result != null && !result.safe() && result.violations() != null) {
            boolean hasForbidden = result.violations().stream()
                    .anyMatch(v -> v.zoneType() != null
                            && ("no_fly_zone".equalsIgnoreCase(v.zoneType())
                                    || "prohibited".equalsIgnoreCase(v.zoneType())
                                    || "emergency_exclusion".equalsIgnoreCase(v.zoneType())));
            if (hasForbidden) {
                String summary = result.violations().stream()
                        .map(v -> v.zoneName() != null ? v.zoneName() : v.reason())
                        .filter(Objects::nonNull)
                        .distinct()
                        .reduce((a, b) -> a + ", " + b)
                        .orElse("NO_FLY_ZONE");
                throw new BadRequestException(MessageCode.AIRSPACE_VIOLATION, "zones", summary);
            }
        }
    }

    private void validateStrategicTrajectoryDeconfliction(Flight flight) {
        if (conflictClientService == null) {
            return;
        }
        Optional<TrajectoryConflictCheckResultClientVm> checkOpt = conflictClientService.checkTrajectory4D(flight);
        if (checkOpt.isPresent() && !checkOpt.get().clear()) {
            TrajectoryConflictCheckResultClientVm check = checkOpt.get();
            throw new BadRequestException(MessageCode.TRAJECTORY_CONFLICT_DETECTED,
                    "recommendation", check.recommendation() != null
                            ? check.recommendation()
                            : "4D trajectory separation conflict detected with another active or authorized flight");
        }
    }

    private void validateHubCapacity(Flight flight, String hubId, boolean departure) {
        if (hubId == null || hubId.isBlank() || hubClientService == null) {
            return;
        }
        hubClientService.getHubById(hubId).ifPresent(hub -> {
            Integer maxCap = hub.maxSimultaneousDrones();
            if (maxCap != null && maxCap > 0) {
                long overlappingCount = flightRepository.countOverlappingHubFlights(
                        hubId,
                        departure,
                        CAPACITY_CONFLICT_STATUSES,
                        flight.getScheduledDeparture(),
                        flight.getScheduledArrival(),
                        flight.getId());
                if (overlappingCount >= maxCap) {
                    throw new BadRequestException(MessageCode.HUB_CAPACITY_EXCEEDED, "hubId", hubId);
                }
            }
        });
    }

    private void runAutomaticPreFlightFeasibility(Flight savedFlight, List<FlightWaypointVm> waypoints) {
        if (feasibilityService == null || savedFlight.getId() == null) {
            return;
        }
        try {
            double totalHoverS = extractTotalHoverSeconds(waypoints);
            double payloadKg = savedFlight.getPayloadWeightKg() != null ? savedFlight.getPayloadWeightKg() : 0.0;
            FeasibilityResultVm result = feasibilityService.checkFeasibility(
                    savedFlight.getId(),
                    new FeasibilityCheckPostVm(payloadKg, null, null, totalHoverS > 0 ? totalHoverS : null));
            if (result != null && result.verdict() != null) {
                savedFlight.setFeasibilityVerdict(result.verdict());
            }
        } catch (Exception ex) {
            log.warn("Auto pre-flight feasibility evaluation skipped for flight {}: {}",
                    savedFlight.getId(), ex.getMessage());
        }
    }

    private double extractTotalHoverSeconds(List<FlightWaypointVm> waypoints) {
        if (waypoints == null || waypoints.isEmpty()) {
            return 0.0;
        }
        double total = 0.0;
        for (FlightWaypointVm wp : waypoints) {
            if (wp == null) {
                continue;
            }
            if (wp.hoverDurationSec() != null && wp.hoverDurationSec() > 0) {
                total += wp.hoverDurationSec();
            } else if (wp.actions() != null) {
                Object raw = wp.actions().get("durationS");
                if (raw == null) {
                    raw = wp.actions().get("hoverDurationSec");
                }
                if (raw instanceof Number n && n.doubleValue() > 0) {
                    total += n.doubleValue();
                }
            }
        }
        return total;
    }

    private record TelemetryCompletionSnapshot(GeoJsonLineString actualRoute, Double endingBatteryPct) {
    }

    private Flight runFlightMutation(String id, Flight fallbackFlight, Function<Flight, Flight> mutator) {
        if (transactionTemplate == null) {
            return mutator.apply(fallbackFlight);
        }
        return transactionTemplate.execute(status -> {
            Flight locked = flightRepository.findByIdForUpdate(id)
                    .or(() -> flightRepository.findById(id))
                    .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, "id", id));
            return mutator.apply(locked);
        });
    }

    private TelemetryCompletionSnapshot fetchTelemetryCompletionSnapshot(Flight flight) {
        if (telemetryClientService == null) {
            return new TelemetryCompletionSnapshot(null, null);
        }
        GeoJsonLineString computedRoute = null;
        Double endingBattery = null;
        try {
            List<TelemetryBriefVm> track = telemetryClientService.getFlightTrack(flight.getId());
            if (track != null && !track.isEmpty()) {
                for (int i = track.size() - 1; i >= 0; i--) {
                    if (track.get(i).batteryPercentage() != null) {
                        endingBattery = track.get(i).batteryPercentage();
                        break;
                    }
                }
                if (isRouteEmpty(flight.getActualRoute()) && track.size() >= 2) {
                    List<List<Double>> coords = track.stream()
                            .filter(t -> t.longitude() != null && t.latitude() != null)
                            .map(t -> List.of(t.longitude(), t.latitude(), Objects.requireNonNullElse(t.altitude(), 0.0)))
                            .toList();
                    if (coords.size() >= 2) {
                        computedRoute = GeoJsonLineString.of(coords);
                    }
                }
            }
            if (endingBattery == null && flight.getEndingBatteryPct() == null) {
                endingBattery = telemetryClientService.getLatestFlightTelemetry(flight.getId())
                        .map(TelemetryBriefVm::batteryPercentage)
                        .orElse(null);
            }
        } catch (Exception ex) {
            log.warn("Failed to populate actualRoute / endingBattery from telemetry for flight {}: {}",
                    flight.getId(), ex.getMessage());
        }
        return new TelemetryCompletionSnapshot(computedRoute, endingBattery);
    }

    private void applyTelemetrySnapshot(Flight target, TelemetryCompletionSnapshot snapshot) {
        if (snapshot == null) {
            return;
        }
        if (snapshot.endingBatteryPct() != null) {
            target.setEndingBatteryPct(snapshot.endingBatteryPct());
        }
        if (snapshot.actualRoute() != null && isRouteEmpty(target.getActualRoute())) {
            target.setActualRoute(snapshot.actualRoute());
        }
    }

    private boolean isRouteEmpty(GeoJsonLineString route) {
        if (route == null || route.coordinates() == null) {
            return true;
        }
        return route.coordinates().size() < 2;
    }

    private List<List<Double>> parseRouteCoordinates(GeoJsonLineString route) {
        return route != null && route.coordinates() != null ? route.coordinates() : List.of();
    }

    private GeoJsonLineString buildPlannedRoute(FlightPostVm postVm, HubBriefVm depHub, HubBriefVm arrHub) {
        if (postVm.plannedRoute() != null && postVm.plannedRoute().coordinates() != null
                && !postVm.plannedRoute().coordinates().isEmpty()) {
            return GeoJsonLineString.of(postVm.plannedRoute().coordinates());
        }

        if (postVm.waypoints() != null && !postVm.waypoints().isEmpty()) {
            List<List<Double>> anchored = anchorWaypointsWithHubs(
                    postVm.waypoints(), depHub, arrHub, postVm.cruisingAltitudeM());
            if (anchored.size() >= 2) {
                return GeoJsonLineString.of(anchored);
            }
        }

        double cruiseAlt = postVm.cruisingAltitudeM() != null && postVm.cruisingAltitudeM() > 0
                ? postVm.cruisingAltitudeM()
                : DEFAULT_CRUISING_ALT_AGL;
        List<List<Double>> fallbackCoords = new ArrayList<>();
        if (hasValidCoordinates(depHub)) {
            fallbackCoords.add(List.of(depHub.location().lng(), depHub.location().lat(), 0.0));
            fallbackCoords.add(List.of(depHub.location().lng(), depHub.location().lat(), cruiseAlt));
        }
        if (hasValidCoordinates(arrHub)) {
            fallbackCoords.add(List.of(arrHub.location().lng(), arrHub.location().lat(), cruiseAlt));
            fallbackCoords.add(List.of(arrHub.location().lng(), arrHub.location().lat(), 0.0));
        }

        return GeoJsonLineString.of(fallbackCoords);
    }

    /**
     * Vertical Climb / Vertical Descent AGL hub anchoring: climbs vertically at the departure Vertiport pad
     * from 0m AGL to the first airborne waypoint altitude and descends vertically at the arrival Vertiport pad
     * so trajectories never slice diagonally below airspace corridor floors.
     */
    private List<List<Double>> anchorWaypointsWithHubs(
            List<FlightWaypointVm> waypoints,
            HubBriefVm depHub,
            HubBriefVm arrHub,
            Double cruisingAltitudeM
    ) {
        double fallbackAlt = cruisingAltitudeM != null && cruisingAltitudeM > 0
                ? cruisingAltitudeM
                : DEFAULT_CRUISING_ALT_AGL;

        List<List<Double>> rawPoints = new ArrayList<>();
        Double firstAirAlt = null;
        Double lastAirAlt = null;

        for (FlightWaypointVm wp : waypoints) {
            if (wp != null && wp.longitude() != null && wp.latitude() != null) {
                double alt = wp.altitude() != null ? Math.max(0.0, wp.altitude()) : fallbackAlt;
                if (alt > 0.0) {
                    if (firstAirAlt == null) {
                        firstAirAlt = alt;
                    }
                    lastAirAlt = alt;
                }
                rawPoints.add(List.of(wp.longitude(), wp.latitude(), alt));
            }
        }

        double depCruiseAlt = firstAirAlt != null ? firstAirAlt : fallbackAlt;
        double arrCruiseAlt = lastAirAlt != null ? lastAirAlt : depCruiseAlt;

        List<List<Double>> coords = new ArrayList<>();

        if (hasValidCoordinates(depHub)) {
            double depLat = depHub.location().lat();
            double depLon = depHub.location().lng();
            coords.add(List.of(depLon, depLat, 0.0));
            coords.add(List.of(depLon, depLat, depCruiseAlt));
        }

        for (int i = 0; i < rawPoints.size(); i++) {
            List<Double> pt = rawPoints.get(i);
            boolean nearDep = hasValidCoordinates(depHub)
                    && haversineMeters(depHub.location().lat(), depHub.location().lng(), pt.get(1), pt.get(0)) <= HUB_ANCHOR_THRESHOLD_M;
            boolean nearArr = hasValidCoordinates(arrHub)
                    && haversineMeters(arrHub.location().lat(), arrHub.location().lng(), pt.get(1), pt.get(0)) <= HUB_ANCHOR_THRESHOLD_M;

            if (i == 0 && nearDep && pt.get(2) <= 0.0) {
                continue;
            }
            if (i == rawPoints.size() - 1 && nearArr && pt.get(2) <= 0.0) {
                continue;
            }
            if (pt.get(2) <= 0.0) {
                double transitionAlt = !coords.isEmpty() && coords.getLast().get(2) > 0.0
                        ? coords.getLast().get(2)
                        : depCruiseAlt;
                coords.add(List.of(pt.get(0), pt.get(1), transitionAlt));
                coords.add(List.of(pt.get(0), pt.get(1), 0.0));
                if (i < rawPoints.size() - 1) {
                    double nextAlt = rawPoints.get(i + 1).get(2) > 0.0 ? rawPoints.get(i + 1).get(2) : arrCruiseAlt;
                    coords.add(List.of(pt.get(0), pt.get(1), nextAlt));
                }
            } else {
                coords.add(pt);
            }
        }

        if (hasValidCoordinates(arrHub)) {
            double arrLat = arrHub.location().lat();
            double arrLon = arrHub.location().lng();
            if (coords.isEmpty() || coords.getLast().get(2) > 0.0
                    || haversineMeters(arrLat, arrLon, coords.getLast().get(1), coords.getLast().get(0)) > HUB_ANCHOR_THRESHOLD_M) {
                coords.add(List.of(arrLon, arrLat, arrCruiseAlt));
                coords.add(List.of(arrLon, arrLat, 0.0));
            }
        }

        return coords;
    }

    private boolean hasValidCoordinates(HubBriefVm hub) {
        return hub != null && hub.location() != null
                && hub.location().lat() != null && hub.location().lng() != null;
    }

    private double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                        * Math.sin(dLon / 2.0) * Math.sin(dLon / 2.0);
        double c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
        return EARTH_RADIUS_M * c;
    }

    private void publishEvent(
            String eventType,
            Flight flight,
            String actualLandingHubId,
            Integer waypointIndex,
            String reason
    ) {
        if (flightEventPublisher != null) {
            flightEventPublisher.publish(eventType, flight, actualLandingHubId, waypointIndex, reason);
        }
    }
}

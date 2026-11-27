package com.utm.simulation.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.commonlibrary.kafka.event.DroneCommandEvent;
import com.utm.commonlibrary.service.SystemTokenService;
import com.utm.simulation.kafka.SimulationCommandAckPublisher;
import com.utm.simulation.service.client.FlightClientService;
import com.utm.simulation.service.client.MissionClientService;
import com.utm.simulation.service.client.TelemetryClientService;
import com.utm.simulation.viewmodel.client.TelemetryLatestVm;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.simulation.mapper.SimulationMapper;
import com.utm.simulation.model.SimulationEvent;
import com.utm.simulation.model.SimulationSession;
import com.utm.simulation.model.enumeration.EmergencyScenarioType;
import com.utm.simulation.model.enumeration.SimulationStatus;
import com.utm.simulation.repository.SimulationEventRepository;
import com.utm.simulation.repository.SimulationSessionRepository;
import com.utm.simulation.viewmodel.client.FlightDetailVm;
import com.utm.simulation.viewmodel.scenario.InjectScenarioResultVm;
import com.utm.simulation.viewmodel.scenario.InjectScenarioVm;
import com.utm.simulation.viewmodel.scenario.ScenarioCatalogVm;
import com.utm.simulation.viewmodel.session.SimulationEventVm;
import com.utm.simulation.viewmodel.session.SimulationSessionCreateVm;
import com.utm.simulation.viewmodel.session.SimulationSessionListVm;
import com.utm.simulation.viewmodel.session.SimulationSessionVm;
import com.utm.simulation.viewmodel.client.TelemetryPushVm;
import com.utm.simulation.viewmodel.client.WaypointVm;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.persistence.criteria.Predicate;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

@Service
@Slf4j
public class SimulationServiceImpl implements SimulationService {

    private static final double EARTH_RADIUS_METERS = 6371000.0;
    private static final Set<String> NON_SIMULATABLE_FLIGHT_STATUSES = Set.of(
            "planned", "scheduled", "completed", "cancelled", "rejected", "emergency_landing");

    private final SimulationSessionRepository sessionRepository;
    private final SimulationEventRepository eventRepository;
    private final SimulationMapper simulationMapper;
    private final TelemetryClientService telemetryClientService;
    private final FlightClientService flightClientService;
    private final ObjectMapper objectMapper;
    private final MissionClientService missionClientService;

    @Autowired(required = false)
    private SystemTokenService systemTokenService;

    @Autowired(required = false)
    private SimulationCommandAckPublisher commandAckPublisher;

    void setCommandAckPublisher(SimulationCommandAckPublisher commandAckPublisher) {
        this.commandAckPublisher = commandAckPublisher;
    }

    public SimulationServiceImpl(
            SimulationSessionRepository sessionRepository,
            SimulationEventRepository eventRepository,
            SimulationMapper simulationMapper,
            TelemetryClientService telemetryClientService,
            FlightClientService flightClientService,
            ObjectMapper objectMapper) {
        this(sessionRepository, eventRepository, simulationMapper, telemetryClientService,
                flightClientService, objectMapper, null);
    }

    @Autowired
    public SimulationServiceImpl(
            SimulationSessionRepository sessionRepository,
            SimulationEventRepository eventRepository,
            SimulationMapper simulationMapper,
            TelemetryClientService telemetryClientService,
            FlightClientService flightClientService,
            ObjectMapper objectMapper,
            @Autowired(required = false) MissionClientService missionClientService) {
        this.sessionRepository = sessionRepository;
        this.eventRepository = eventRepository;
        this.simulationMapper = simulationMapper;
        this.telemetryClientService = telemetryClientService;
        this.flightClientService = flightClientService;
        this.objectMapper = objectMapper;
        this.missionClientService = missionClientService;
    }

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(8,
            Thread.ofVirtual().factory());
    private final Map<String, SimulationSessionRuntime> activeRuntimes = new ConcurrentHashMap<>();

    @PostConstruct
    public void recoverOrphanedSessions() {
        try {
            List<SimulationSession> orphaned = sessionRepository.findByStatusIn(
                    List.of(SimulationStatus.RUNNING, SimulationStatus.PAUSED));
            if (!orphaned.isEmpty()) {
                for (SimulationSession session : orphaned) {
                    session.setStatus(SimulationStatus.STOPPED);
                }
                sessionRepository.saveAll(orphaned);
                log.warn("Marked {} orphaned simulation sessions as STOPPED on startup", orphaned.size());
            }
        } catch (Exception ex) {
            log.warn("Failed to recover orphaned simulation sessions on startup: {}", ex.getMessage());
        }
    }

    @Override
    @Transactional
    public SimulationSessionVm createSession(SimulationSessionCreateVm createVm) {
        String flightId = createVm.flightId();
        String missionId = createVm.missionId();
        boolean hasFlightId = flightId != null && !flightId.isBlank();
        boolean hasMissionId = missionId != null && !missionId.isBlank();
        boolean hasManualWaypoints = createVm.waypoints() != null && createVm.waypoints().size() >= 2;

        if (!hasFlightId && !hasMissionId && !hasManualWaypoints) {
            throw new BadRequestException(MessageCode.FLIGHT_NOT_FOUND, "id", "null");
        }

        String resolvedFlightId = null;
        String resolvedMissionId = hasMissionId ? missionId.trim() : null;
        String droneId = createVm.droneId();
        String departureHubId = null;
        String arrivalHubId = null;
        Double flightCruiseAlt = null;
        List<WaypointVm> waypoints;

        if (hasFlightId) {
            FlightDetailVm flight = flightClientService.getFlightDetail(flightId.trim());
            if (flight == null) {
                throw new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, "id", flightId);
            }
            if (flight.status() != null && NON_SIMULATABLE_FLIGHT_STATUSES.contains(flight.status().trim().toLowerCase(Locale.ROOT))) {
                throw new BadRequestException(MessageCode.FLIGHT_NOT_SIMULATABLE, "flightId", flightId, "status", flight.status());
            }
            droneId = flight.droneId();
            departureHubId = flight.departureHubId();
            arrivalHubId = flight.arrivalHubId();
            flightCruiseAlt = flight.cruisingAltitudeM();
            if (droneId == null || droneId.isBlank()) {
                throw new BadRequestException(MessageCode.DRONE_NOT_FOUND, "id",
                        flight.flightNumber() != null ? flight.flightNumber() : flightId);
            }
            if (sessionRepository.existsByDroneIdAndStatusIn(droneId,
                    List.of(SimulationStatus.RUNNING, SimulationStatus.PAUSED))) {
                throw new DuplicatedException(MessageCode.SIMULATION_ALREADY_ACTIVE, "droneId", droneId);
            }
            if (sessionRepository.existsByFlightIdAndStatusIn(flightId,
                    List.of(SimulationStatus.RUNNING, SimulationStatus.PAUSED))) {
                throw new DuplicatedException(MessageCode.SIMULATION_ALREADY_ACTIVE, "flightId", flightId);
            }
            waypoints = resolveWaypoints(flight);
            if (calculateTotalDistance(waypoints) < 10.0) {
                throw new BadRequestException(MessageCode.INVALID_SIMULATION_WAYPOINTS);
            }
            resolvedFlightId = flight.id() != null ? flight.id() : flightId;
            boolean shouldAutoStartFlight = "authorized".equalsIgnoreCase(flight.status());
            if (shouldAutoStartFlight && !flightClientService.startFlight(resolvedFlightId)) {
                throw new BadRequestException(MessageCode.FLIGHT_NOT_SIMULATABLE,
                        "flightId", resolvedFlightId,
                        "reason", "Failed to start authorized flight before launching simulation");
            }
        } else if (hasMissionId) {
            var missionOpt = missionClientService != null
                    ? missionClientService.getMissionById(resolvedMissionId)
                    : java.util.Optional.<MissionClientService.MissionSimulationVm>empty();
            if (missionOpt.isEmpty()) {
                throw new NotFoundException(MessageCode.MISSION_NOT_FOUND, "id", resolvedMissionId);
            }
            if (droneId == null || droneId.isBlank()) {
                droneId = missionOpt.get().droneId();
            }
            if (droneId == null || droneId.isBlank()) {
                throw new BadRequestException(MessageCode.DRONE_NOT_FOUND, "id", resolvedMissionId);
            }
            if (sessionRepository.existsByDroneIdAndStatusIn(droneId,
                    List.of(SimulationStatus.RUNNING, SimulationStatus.PAUSED))) {
                throw new DuplicatedException(MessageCode.SIMULATION_ALREADY_ACTIVE, "droneId", droneId);
            }
            waypoints = hasManualWaypoints ? createVm.waypoints() : missionClientService.toSimulationWaypoints(missionOpt.get());
            if (waypoints.size() < 2) {
                throw new BadRequestException(MessageCode.INVALID_SIMULATION_WAYPOINTS);
            }
        } else {
            if (droneId == null || droneId.isBlank()) {
                throw new BadRequestException(MessageCode.DRONE_NOT_FOUND, "id", "manual");
            }
            if (sessionRepository.existsByDroneIdAndStatusIn(droneId,
                    List.of(SimulationStatus.RUNNING, SimulationStatus.PAUSED))) {
                throw new DuplicatedException(MessageCode.SIMULATION_ALREADY_ACTIVE, "droneId", droneId);
            }
            waypoints = createVm.waypoints();
        }

        double totalDist = calculateTotalDistance(waypoints);
        if (totalDist < 10.0) {
            throw new BadRequestException(MessageCode.INVALID_SIMULATION_WAYPOINTS);
        }

        WaypointVm first = waypoints.getFirst();
        WaypointVm second = waypoints.get(1);
        double initialHeading = calculateBearing(first.lat(), first.lon(), second.lat(), second.lon());

        SimulationSession entity = simulationMapper.toEntity(createVm);
        entity.setDroneId(droneId);
        entity.setFlightId(resolvedFlightId);
        entity.setMissionId(resolvedMissionId);
        entity.setFlightPhase("TAKEOFF");
        entity.setTickRate(createVm.tickRate());
        entity.setWaypoints(waypoints);
        entity.setStatus(SimulationStatus.RUNNING);
        entity.setCurrentLat(first.lat());
        entity.setCurrentLon(first.lon());
        entity.setCurrentAlt(first.alt());
        entity.setCurrentHeading(initialHeading);
        entity.setTotalDistance(totalDist);

        SimulationSession saved = sessionRepository.saveAndFlush(entity);

        long tickPeriodMs = Math.max(100L, Math.round(1000.0 / createVm.tickRate()));
        String currentBearerToken = extractCurrentBearerToken();
        SimulationSessionRuntime runtime = new SimulationSessionRuntime(
                saved, waypoints, currentBearerToken, departureHubId, arrivalHubId, flightCruiseAlt);
        Runnable startRuntime = () -> {
            activeRuntimes.put(saved.getId(), runtime);
            runtime.scheduledFuture = scheduler.scheduleAtFixedRate(
                    () -> runSimulationTick(runtime),
                    0,
                    tickPeriodMs,
                    TimeUnit.MILLISECONDS);
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    startRuntime.run();
                }
            });
        } else {
            startRuntime.run();
        }

        log.info(
                "Initialized virtual flight simulation session '{}' for drone '{}' from flight '{}' at speed {} m/s (scale {}x)",
                saved.getId(), droneId, flightId, createVm.speed(), createVm.timeScale());

        return simulationMapper.toVm(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public SimulationSessionListVm getSessions(SimulationStatus status, String droneId, String flightId, String search,
            int limit, int offset) {
        Specification<SimulationSession> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (droneId != null && !droneId.trim().isBlank()) {
                predicates.add(cb.equal(root.get("droneId"), droneId.trim()));
            }
            if (flightId != null && !flightId.trim().isBlank()) {
                predicates.add(cb.equal(root.get("flightId"), flightId.trim()));
            }
            if (search != null && !search.trim().isBlank()) {
                String searchPattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("flightId")), searchPattern),
                        cb.like(cb.lower(root.get("droneId")), searchPattern),
                        cb.like(cb.lower(root.get("activeScenario")), searchPattern)));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Sort sort = Sort.by(Sort.Direction.DESC, "createdOn");

        if (limit <= 0) {
            List<SimulationSession> all = sessionRepository.findAll(spec, sort);
            List<SimulationSessionVm> items = all.stream()
                    .map(this::syncWithRuntime)
                    .map(simulationMapper::toVm)
                    .toList();
            return SimulationSessionListVm.of(items, items.size());
        }

        int pageSize = limit;
        int pageNumber = offset > 0 ? (offset / pageSize) : 0;
        Pageable pageable = PageRequest.of(pageNumber, pageSize, sort);

        Page<SimulationSession> page = sessionRepository.findAll(spec, pageable);
        List<SimulationSessionVm> items = page.getContent().stream()
                .map(this::syncWithRuntime)
                .map(simulationMapper::toVm)
                .toList();

        return SimulationSessionListVm.of(items, page.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public List<SimulationSessionVm> getAllSessions() {
        return getSessions(null, null, null, null, 0, 0).items();
    }

    @Override
    @Transactional(readOnly = true)
    public List<SimulationSessionVm> getActiveSessions() {
        return sessionRepository
                .findByStatusInOrderByCreatedOnDesc(List.of(SimulationStatus.RUNNING, SimulationStatus.PAUSED)).stream()
                .map(this::syncWithRuntime)
                .map(simulationMapper::toVm)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public SimulationSessionVm getSessionById(String id) {
        SimulationSession session = sessionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.SIMULATION_NOT_FOUND, "id", id));

        return simulationMapper.toVm(syncWithRuntime(session));
    }

    @Override
    @Transactional
    public void deleteSession(String id) {
        SimulationSession session = sessionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.SIMULATION_NOT_FOUND, "id", id));

        boolean wasActive = session.getStatus() == SimulationStatus.RUNNING
                || session.getStatus() == SimulationStatus.PAUSED;
        String linkedFlightId = session.getFlightId();

        SimulationSessionRuntime runtime = activeRuntimes.remove(id);
        if (runtime != null) {
            runtime.cancelFutures(true);
        }

        List<SimulationEvent> events = eventRepository.findBySessionIdOrderByCreatedOnAsc(id);
        if (!events.isEmpty()) {
            eventRepository.deleteAll(events);
        }

        sessionRepository.delete(session);
        if (wasActive && linkedFlightId != null && !linkedFlightId.isBlank()) {
            flightClientService.abortFlight(linkedFlightId, "Simulation session deleted while active");
        }
        log.info("Deleted simulation session '{}'", id);
    }

    @Override
    @Transactional
    public SimulationSessionVm pauseSession(String id) {
        SimulationSession session = sessionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.SIMULATION_NOT_FOUND, "id", id));

        if (session.getStatus() == SimulationStatus.PAUSED) {
            throw new BadRequestException(MessageCode.INVALID_SIMULATION_STATE, "reason",
                    "Simulation session is already paused");
        }
        if (session.getStatus() != SimulationStatus.RUNNING) {
            throw new BadRequestException(MessageCode.INVALID_SIMULATION_STATE, "reason",
                    "Cannot pause a " + session.getStatus().getValue()
                            + " simulation session. Only running sessions can be paused.");
        }

        SimulationSessionRuntime runtime = activeRuntimes.get(id);
        if (runtime != null) {
            runtime.lock.lock();
            try {
                runtime.status = SimulationStatus.PAUSED;
            } finally {
                runtime.lock.unlock();
            }
        }

        session.setStatus(SimulationStatus.PAUSED);
        SimulationSession saved = sessionRepository.save(session);

        recordEvent(id, "SESSION_PAUSED", null, "Simulation session temporarily paused", "LOW", null);
        log.info("Paused simulation session '{}'", id);
        return simulationMapper.toVm(saved);
    }

    @Override
    @Transactional
    public SimulationSessionVm resumeSession(String id) {
        SimulationSession session = sessionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.SIMULATION_NOT_FOUND, "id", id));

        if (session.getStatus() == SimulationStatus.RUNNING) {
            throw new BadRequestException(MessageCode.INVALID_SIMULATION_STATE, "reason",
                    "Simulation session is already running");
        }
        if (session.getStatus() != SimulationStatus.PAUSED) {
            throw new BadRequestException(MessageCode.INVALID_SIMULATION_STATE, "reason",
                    "Cannot resume a " + session.getStatus().getValue()
                            + " simulation session. Only paused sessions can be resumed.");
        }

        SimulationSessionRuntime runtime = activeRuntimes.get(id);
        if (runtime == null) {
            throw new BadRequestException(MessageCode.INVALID_SIMULATION_STATE, "reason",
                    "No active in-memory runtime found for simulation session: " + id);
        }

        runtime.lock.lock();
        try {
            runtime.status = SimulationStatus.RUNNING;
        } finally {
            runtime.lock.unlock();
        }

        session.setStatus(SimulationStatus.RUNNING);
        SimulationSession saved = sessionRepository.save(session);

        recordEvent(id, "SESSION_RESUMED", null, "Simulation session resumed flight path", "LOW", null);
        log.info("Resumed simulation session '{}'", id);
        return simulationMapper.toVm(saved);
    }

    @Override
    @Transactional
    public SimulationSessionVm updateTimeScale(String id, Double timeScale) {
        SimulationSession session = sessionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.SIMULATION_NOT_FOUND, "id", id));

        if (session.getStatus() != SimulationStatus.RUNNING && session.getStatus() != SimulationStatus.PAUSED) {
            throw new BadRequestException(MessageCode.INVALID_SIMULATION_STATE, "reason",
                    "Cannot update time scale on a " + session.getStatus().getValue() + " simulation session");
        }

        SimulationSessionRuntime runtime = activeRuntimes.get(id);
        if (runtime != null) {
            runtime.lock.lock();
            try {
                runtime.timeScale = timeScale;
            } finally {
                runtime.lock.unlock();
            }
        }

        session.setTimeScale(timeScale);
        SimulationSession saved = sessionRepository.save(session);

        recordEvent(id, "TIME_SCALE_CHANGED", null, "Time scale updated to " + timeScale + "x", "LOW", null);
        log.info("Updated time scale for simulation session '{}' to {}x", id, timeScale);
        return simulationMapper.toVm(saved);
    }

    @Override
    @Transactional
    public InjectScenarioResultVm injectScenario(String id, InjectScenarioVm injectVm) {
        SimulationSession session = sessionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.SIMULATION_NOT_FOUND, "id", id));

        if (session.getStatus() != SimulationStatus.RUNNING && session.getStatus() != SimulationStatus.PAUSED) {
            throw new BadRequestException(MessageCode.INVALID_SIMULATION_STATE, "reason",
                    "Cannot inject scenario into a " + session.getStatus().getValue() + " simulation session");
        }

        EmergencyScenarioType scenario = injectVm.scenario();
        String scenarioCode = scenario.getValue();
        Map<String, Object> configMap = (injectVm.config() != null && !injectVm.config().isEmpty())
                ? Map.copyOf(injectVm.config())
                : null;
        Long durationSeconds = extractDurationSeconds(configMap);
        Map<String, Object> triggerMap = extractTriggerMap(configMap);

        SimulationSessionRuntime runtime = activeRuntimes.get(id);
        boolean armedForTrigger = triggerMap != null && !triggerMap.isEmpty();
        if (runtime != null) {
            runtime.lock.lock();
            try {
                if (runtime.scenarioClearFuture != null) {
                    runtime.scenarioClearFuture.cancel(false);
                    runtime.scenarioClearFuture = null;
                }
                if (armedForTrigger) {
                    runtime.pendingScenario = scenarioCode;
                    runtime.pendingScenarioConfig = configMap;
                    runtime.pendingTrigger = triggerMap;
                } else {
                    runtime.pendingScenario = null;
                    runtime.pendingScenarioConfig = null;
                    runtime.pendingTrigger = null;
                    runtime.activeScenario = scenarioCode;
                    runtime.scenarioConfig = configMap;
                    if ("c2_lost".equalsIgnoreCase(scenarioCode)) {
                        runtime.c2LostSeconds = 0.0;
                        runtime.failsafeRerouteActive = false;
                        runtime.speed = 0.0;
                    }
                    if (durationSeconds != null && durationSeconds > 0) {
                        runtime.scenarioClearFuture = scheduler.schedule(
                                () -> autoClearScenarioIfMatches(id, scenarioCode),
                                durationSeconds,
                                TimeUnit.SECONDS);
                    }
                }
            } finally {
                runtime.lock.unlock();
            }
        }

        if (!armedForTrigger) {
            session.setActiveScenario(scenarioCode);
        }
        session.setScenarioConfig(configMap);
        sessionRepository.save(session);

        String message = armedForTrigger
                ? String.format("Armed conditional emergency scenario '%s' (%s)", scenario.getDisplayName(), triggerMap)
                : String.format("Injected emergency scenario '%s' (%s)", scenario.getDisplayName(),
                        scenario.getDescription());
        SimulationEvent event = recordEvent(id, armedForTrigger ? "SCENARIO_ARMED" : "SCENARIO_INJECTED",
                scenarioCode, message, scenario.getDefaultSeverity(), configMap);

        log.warn("{} emergency scenario '{}' into session '{}' for drone '{}'",
                armedForTrigger ? "Armed" : "Injected", scenarioCode, id, session.getDroneId());

        return new InjectScenarioResultVm(true, simulationMapper.toVm(event));
    }

    @Override
    @Transactional
    public SimulationSessionVm clearScenario(String id) {
        SimulationSession session = sessionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.SIMULATION_NOT_FOUND, "id", id));

        String previousScenario = session.getActiveScenario();

        SimulationSessionRuntime runtime = activeRuntimes.get(id);
        double restoredSpeed = session.getSpeed() != null && session.getSpeed() > 0.0 ? session.getSpeed() : 15.0;
        Double restoredBattery = session.getCurrentBattery();
        if (runtime != null) {
            runtime.lock.lock();
            try {
                if (runtime.scenarioClearFuture != null) {
                    runtime.scenarioClearFuture.cancel(false);
                    runtime.scenarioClearFuture = null;
                }
                runtime.activeScenario = null;
                runtime.scenarioConfig = null;
                runtime.pendingScenario = null;
                runtime.pendingScenarioConfig = null;
                runtime.pendingTrigger = null;
                runtime.c2LostSeconds = 0.0;
                runtime.failsafeRerouteActive = false;
                if (runtime.currentBattery > 0.0) {
                    runtime.speed = runtime.cruiseSpeed;
                }
                restoredSpeed = runtime.cruiseSpeed;
                restoredBattery = runtime.currentBattery;
            } finally {
                runtime.lock.unlock();
            }
        }

        session.setActiveScenario(null);
        session.setSpeed(restoredSpeed);
        if (restoredBattery != null) {
            session.setCurrentBattery(restoredBattery);
        }
        SimulationSession saved = sessionRepository.save(session);

        recordEvent(id, "SCENARIO_CLEARED", previousScenario,
                "Emergency scenario cleared. Restored normal flight parameters.", "LOW", null);
        log.info("Cleared scenario for simulation session '{}', restored speed to {} m/s",
                id, saved.getSpeed());

        return simulationMapper.toVm(saved);
    }

    @Override
    @Transactional
    public SimulationSessionVm stopSession(String id) {
        SimulationSession session = sessionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.SIMULATION_NOT_FOUND, "id", id));

        if (session.getStatus() == SimulationStatus.STOPPED) {
            throw new BadRequestException(MessageCode.INVALID_SIMULATION_STATE, "reason",
                    "Simulation session is already stopped");
        }
        if (session.getStatus() == SimulationStatus.COMPLETED) {
            throw new BadRequestException(MessageCode.INVALID_SIMULATION_STATE, "reason",
                    "Cannot stop an already completed simulation session");
        }

        SimulationSessionRuntime runtime = activeRuntimes.remove(id);
        if (runtime != null) {
            runtime.lock.lock();
            try {
                runtime.status = SimulationStatus.STOPPED;
            } finally {
                runtime.lock.unlock();
            }
            runtime.cancelFutures(true);
        }

        session.setStatus(SimulationStatus.STOPPED);
        SimulationSession saved = sessionRepository.save(session);

        recordEvent(id, "SESSION_STOPPED", null, "Simulation session stopped by operator", "LOW", null);
        if (session.getFlightId() != null && !session.getFlightId().isBlank()) {
            flightClientService.abortFlight(session.getFlightId(), "Simulation session stopped by operator");
        }
        log.info("Stopped simulation session '{}'", id);
        return simulationMapper.toVm(saved);
    }

    @Override
    public List<ScenarioCatalogVm> getScenarioCatalog() {
        return Arrays.stream(EmergencyScenarioType.values())
                .map(type -> new ScenarioCatalogVm(
                        type.getValue(),
                        type.getDisplayName(),
                        type.getDescription(),
                        type.getDefaultSeverity(),
                        getScenarioParams(type)))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<SimulationEventVm> getSessionEvents(String id) {
        return simulationMapper.toEventVmList(eventRepository.findBySessionIdOrderByCreatedOnAsc(id));
    }

    @Override
    public void handleDroneCommand(DroneCommandEvent commandEvent) {
        if (commandEvent == null || commandEvent.commandType() == null || commandEvent.commandType().isBlank()) {
            return;
        }
        String cmdType = commandEvent.commandType().trim().toUpperCase(Locale.ROOT);
        SimulationSessionRuntime runtime = findActiveRuntime(commandEvent.flightId(), commandEvent.droneId());
        if (runtime == null) {
            runtime = bootstrapRuntimeForCommand(commandEvent, cmdType);
        }
        if (runtime == null) {
            log.debug("No simulatable flight runtime available for command {} (drone={}, flight={})",
                    cmdType, commandEvent.droneId(), commandEvent.flightId());
            publishCommandAck(commandEvent.commandId(), commandEvent.droneId(), commandEvent.flightId(),
                    cmdType, "FAILED", "No active or authorized flight available for C2 simulation");
            return;
        }

        JsonNode params = parseCommandParameters(commandEvent.parameters());
        RuntimeSnapshot snapshot = null;
        String eventMessage;
        List<String> preemptedCmdIds = List.of();
        String preemptedCmdType = null;

        runtime.lock.lock();
        try {
            if (runtime.status != SimulationStatus.RUNNING && runtime.status != SimulationStatus.PAUSED) {
                publishCommandAck(commandEvent.commandId(), runtime.droneId, runtime.flightId,
                        cmdType, "FAILED", "Simulation session has already terminated");
                return;
            }
            boolean sameOngoingManeuver = cmdType.equals(runtime.activeCommandType)
                    && ("RTL".equals(cmdType) || "LAND".equals(cmdType) || "TAKEOFF".equals(cmdType))
                    && extractDouble(params, "latitude", "lat") == null;
            if (!sameOngoingManeuver && !runtime.activeCommandIds.isEmpty()) {
                preemptedCmdIds = runtime.drainActiveCommandIdsExcept(commandEvent.commandId());
                preemptedCmdType = runtime.activeCommandType;
            }

            if (sameOngoingManeuver && "RTL".equals(cmdType) && runtime.rtlActive) {
                runtime.registerActiveCommand(commandEvent.commandId(), cmdType);
                eventMessage = "Joined ongoing 3D return-to-home trajectory to departure hub";
                snapshot = runtime.snapshot();
            } else switch (cmdType) {
                case "TAKEOFF" -> {
                    runtime.status = SimulationStatus.RUNNING;
                    runtime.holdingByCommand = false;
                    runtime.forcedDescentActive = false;
                    runtime.emergencyStopActive = false;
                    runtime.rtlActive = false;
                    runtime.failsafeRerouteActive = false;
                    runtime.operatorOverride = true;
                    double targetClimbAlt = Math.max(runtime.defaultCruiseAlt, 20.0);
                    Double requestedAlt = extractDouble(params, "altitude", "alt", "targetAltitude");
                    if (requestedAlt != null && requestedAlt > 5.0) {
                        targetClimbAlt = requestedAlt;
                    }
                    runtime.registerActiveCommand(commandEvent.commandId(), cmdType);
                    if (runtime.currentAlt < targetClimbAlt - 1.0) {
                        runtime.takeoffClimbActive = true;
                        runtime.ackPendingOnNextTick = false;
                        List<WaypointVm> climbAndCruise = new ArrayList<>();
                        climbAndCruise.add(new WaypointVm(runtime.currentLat, runtime.currentLon, runtime.currentAlt, 4.0, 0, null));
                        climbAndCruise.add(new WaypointVm(runtime.currentLat, runtime.currentLon, targetClimbAlt, 4.0, 0, null));
                        for (int i = 1; i < runtime.originalWaypoints.size(); i++) {
                            climbAndCruise.add(runtime.originalWaypoints.get(i));
                        }
                        runtime.reroutePath(climbAndCruise);
                        runtime.speed = runtime.cruiseSpeed;
                        eventMessage = String.format(Locale.US,
                                "C2 command TAKEOFF applied: ascending from %.1fm to %.1fm cruise altitude",
                                runtime.currentAlt, targetClimbAlt);
                    } else {
                        runtime.takeoffClimbActive = false;
                        runtime.ackPendingOnNextTick = true;
                        runtime.speed = runtime.cruiseSpeed;
                        eventMessage = "C2 command TAKEOFF applied: aircraft already airborne at cruise altitude";
                    }
                }
                case "HOVER", "PAUSE" -> {
                    runtime.status = SimulationStatus.RUNNING;
                    runtime.holdingByCommand = true;
                    runtime.forcedDescentActive = false;
                    runtime.emergencyStopActive = false;
                    runtime.speed = 0.0;
                    runtime.registerActiveCommand(commandEvent.commandId(), cmdType);
                    runtime.ackPendingOnNextTick = true;
                    eventMessage = "C2 command " + cmdType + " applied: holding current 3D loiter position";
                }
                case "RESUME" -> {
                    runtime.status = SimulationStatus.RUNNING;
                    runtime.holdingByCommand = false;
                    runtime.forcedDescentActive = false;
                    runtime.emergencyStopActive = false;
                    runtime.failsafeRerouteActive = false;
                    runtime.takeoffClimbActive = false;
                    runtime.targetAltitudeOverride = null;
                    runtime.operatorOverride = true;
                    if (runtime.rtlActive) {
                        runtime.rtlActive = false;
                        runtime.rejoinOriginalRoute();
                    }
                    runtime.speed = runtime.cruiseSpeed;
                    runtime.registerActiveCommand(commandEvent.commandId(), cmdType);
                    runtime.ackPendingOnNextTick = true;
                    eventMessage = "C2 command RESUME applied: resuming planned cruise trajectory";
                }
                case "LAND", "EMERGENCY_STOP" -> {
                    boolean isEstop = "EMERGENCY_STOP".equals(cmdType);
                    runtime.status = SimulationStatus.RUNNING;
                    runtime.forcedDescentActive = true;
                    runtime.emergencyStopActive = isEstop;
                    runtime.rtlActive = false;
                    runtime.takeoffClimbActive = false;
                    runtime.failsafeRerouteActive = false;
                    runtime.operatorOverride = true;
                    runtime.forcedDescentRateMps = isEstop ? 8.0 : 3.5;
                    runtime.forcedDescentReason = isEstop
                            ? "Executed emergency stop motor cut / rapid failsafe descent"
                            : "Executed C2 controlled vertical landing";
                    runtime.holdingByCommand = false;
                    runtime.speed = 0.0;
                    runtime.registerActiveCommand(commandEvent.commandId(), cmdType);
                    runtime.ackPendingOnNextTick = false;
                    eventMessage = isEstop
                            ? "C2 command EMERGENCY_STOP applied: initiating rapid failsafe descent (8.0 m/s)"
                            : "C2 command LAND applied: initiating controlled vertical descent (3.5 m/s)";
                }
                case "RTL" -> {
                    runtime.status = SimulationStatus.RUNNING;
                    runtime.holdingByCommand = false;
                    runtime.forcedDescentActive = false;
                    runtime.emergencyStopActive = false;
                    runtime.takeoffClimbActive = false;
                    runtime.failsafeRerouteActive = true;
                    runtime.rtlActive = true;
                    runtime.operatorOverride = true;
                    runtime.targetAltitudeOverride = null;
                    runtime.speed = runtime.cruiseSpeed;
                    Double targetLat = extractDouble(params, "latitude", "lat");
                    Double targetLon = extractDouble(params, "longitude", "lon", "lng");
                    double homeLat = targetLat != null ? targetLat : runtime.homePadWaypoint.lat();
                    double homeLon = targetLon != null ? targetLon : runtime.homePadWaypoint.lon();
                    double horizToHome = calculateHaversineDistance(
                            runtime.currentLat, runtime.currentLon, homeLat, homeLon);
                    double safeRtlAlt = Math.max(runtime.currentAlt, Math.max(runtime.defaultCruiseAlt, 40.0));

                    List<WaypointVm> rtlPath = new ArrayList<>();
                    rtlPath.add(new WaypointVm(runtime.currentLat, runtime.currentLon, runtime.currentAlt));
                    if (horizToHome > 15.0) {
                        if (runtime.currentAlt < safeRtlAlt - 1.0) {
                            rtlPath.add(new WaypointVm(runtime.currentLat, runtime.currentLon, safeRtlAlt, 4.0, 0, null));
                        }
                        rtlPath.add(new WaypointVm(homeLat, homeLon, safeRtlAlt, runtime.cruiseSpeed, 0, null));
                    }
                    rtlPath.add(new WaypointVm(homeLat, homeLon, 0.0, 3.5, 0, null));
                    runtime.reroutePath(rtlPath);
                    runtime.registerActiveCommand(commandEvent.commandId(), cmdType);
                    runtime.ackPendingOnNextTick = false;
                    eventMessage = String.format(Locale.US,
                            "C2 command RTL applied: executing 3D return-to-home via %.0fm AGL to [%.5f, %.5f] -> 0m touchdown",
                            safeRtlAlt, homeLat, homeLon);
                }
                case "GOTO" -> {
                    Double targetLat = extractDouble(params, "latitude", "lat");
                    Double targetLon = extractDouble(params, "longitude", "lon", "lng");
                    if (targetLat == null || targetLon == null) {
                        log.warn("Ignoring GOTO command {} without valid coordinates", commandEvent.commandId());
                        publishCommandAck(commandEvent.commandId(), runtime.droneId, runtime.flightId,
                                cmdType, "FAILED", "Missing target latitude/longitude for GOTO");
                        return;
                    }
                    Double targetAlt = extractDouble(params, "altitude", "alt", "targetAltitude");
                    double effectiveAlt = targetAlt != null ? targetAlt : runtime.currentAlt;
                    runtime.status = SimulationStatus.RUNNING;
                    runtime.holdingByCommand = false;
                    runtime.forcedDescentActive = false;
                    runtime.emergencyStopActive = false;
                    runtime.rtlActive = false;
                    runtime.takeoffClimbActive = false;
                    runtime.failsafeRerouteActive = true;
                    runtime.operatorOverride = true;
                    runtime.targetAltitudeOverride = null;
                    runtime.speed = runtime.cruiseSpeed;
                    runtime.rerouteTo(new WaypointVm(targetLat, targetLon, effectiveAlt));
                    runtime.registerActiveCommand(commandEvent.commandId(), cmdType);
                    runtime.ackPendingOnNextTick = false;
                    eventMessage = String.format(Locale.US,
                            "C2 command GOTO applied: diverting to [%.5f, %.5f, %.1fm]",
                            targetLat, targetLon, effectiveAlt);
                }
                case "SET_ALTITUDE" -> {
                    Double targetAlt = extractDouble(params, "targetAltitude", "altitude", "alt");
                    if (targetAlt == null) {
                        log.warn("Ignoring SET_ALTITUDE command {} without targetAltitude", commandEvent.commandId());
                        publishCommandAck(commandEvent.commandId(), runtime.droneId, runtime.flightId,
                                cmdType, "FAILED", "Missing targetAltitude parameter");
                        return;
                    }
                    runtime.status = SimulationStatus.RUNNING;
                    runtime.targetAltitudeOverride = Math.max(0.0, targetAlt);
                    runtime.registerActiveCommand(commandEvent.commandId(), cmdType);
                    runtime.ackPendingOnNextTick = Math.abs(runtime.currentAlt - runtime.targetAltitudeOverride) <= 0.5;
                    eventMessage = String.format(Locale.US,
                            "C2 command SET_ALTITUDE applied: adjusting target altitude to %.1fm",
                            runtime.targetAltitudeOverride);
                }
                default -> {
                    log.debug("Simulation acknowledging non-maneuver C2 command type: {}", cmdType);
                    publishCommandAck(commandEvent.commandId(), runtime.droneId, runtime.flightId,
                            cmdType, "ACKNOWLEDGED", "Configuration command acknowledged by simulator");
                    publishCommandAck(commandEvent.commandId(), runtime.droneId, runtime.flightId,
                            cmdType, "COMPLETED", "Configuration command applied");
                    return;
                }
            }
            snapshot = runtime.snapshot();
        } finally {
            runtime.lock.unlock();
        }

        for (String preemptedId : preemptedCmdIds) {
            publishCommandAck(preemptedId, runtime.droneId, runtime.flightId,
                    preemptedCmdType, "CANCELLED", "Preempted by operator command " + cmdType);
        }
        publishCommandAck(commandEvent.commandId(), runtime.droneId, runtime.flightId,
                cmdType, "ACKNOWLEDGED", "C2 command accepted by onboard flight controller");
        publishCommandAck(commandEvent.commandId(), runtime.droneId, runtime.flightId,
                cmdType, "EXECUTING", eventMessage);

        if (snapshot != null) {
            persistRuntimeState(snapshot);
            recordEvent(runtime.sessionId, "COMMAND_EXECUTED", cmdType, eventMessage,
                    ("EMERGENCY_STOP".equals(cmdType) || "LAND".equals(cmdType)) ? "HIGH" : "MEDIUM",
                    parseCommandParametersAsMap(commandEvent.parameters()));
            log.info("Simulation session '{}' reacted to C2 command {}: {}",
                    runtime.sessionId, cmdType, eventMessage);
        }
    }

    private void publishCommandAck(String commandId, String droneId, String flightId,
            String commandType, String status, String message) {
        if (commandAckPublisher != null && commandId != null && !commandId.isBlank()) {
            commandAckPublisher.publishAck(commandId, droneId, flightId, commandType, status, message);
        }
    }

    private SimulationSessionRuntime bootstrapRuntimeForCommand(DroneCommandEvent commandEvent, String cmdType) {
        try {
            FlightDetailVm flight = null;
            if (commandEvent.flightId() != null && !commandEvent.flightId().isBlank()) {
                flight = flightClientService.getFlightDetail(commandEvent.flightId().trim());
            } else if (commandEvent.droneId() != null && !commandEvent.droneId().isBlank()) {
                flight = flightClientService.findControllableFlightByDroneId(commandEvent.droneId().trim());
            }
            if (flight == null || flight.id() == null || flight.droneId() == null || flight.droneId().isBlank()
                    || flight.status() == null) {
                return null;
            }
            String fStatus = flight.status().trim().toLowerCase(Locale.ROOT);
            if ("TAKEOFF".equals(cmdType)) {
                if ("authorized".equals(fStatus)) {
                    if (!flightClientService.startFlight(flight.id())) {
                        log.warn("Auto-attach TAKEOFF could not start authorized flight '{}'", flight.id());
                        return null;
                    }
                } else if (!"active".equals(fStatus)) {
                    return null;
                }
            } else if (!"active".equals(fStatus) && !"diverted".equals(fStatus)) {
                return null;
            }

            SimulationSessionRuntime existing = findActiveRuntime(flight.id(), flight.droneId());
            if (existing != null) {
                return existing;
            }

            List<WaypointVm> waypoints = resolveWaypoints(flight);
            double totalDist = calculateTotalDistance(waypoints);
            if (totalDist < 10.0) {
                return null;
            }

            WaypointVm first = waypoints.getFirst();
            WaypointVm second = waypoints.get(1);
            double startLat = first.lat();
            double startLon = first.lon();
            double startAlt = "TAKEOFF".equals(cmdType) ? 0.0 : first.alt();
            double startHeading = calculateBearing(first.lat(), first.lon(), second.lat(), second.lon());
            double startBattery = 100.0;

            if (!"TAKEOFF".equals(cmdType)) {
                var latestOpt = telemetryClientService.getLatestFlightTelemetry(flight.id());
                if (latestOpt.isPresent()) {
                    TelemetryLatestVm tel = latestOpt.get();
                    if (tel.latitude() != null && tel.longitude() != null) {
                        startLat = tel.latitude();
                        startLon = tel.longitude();
                    }
                    if (tel.altitude() != null && tel.altitude() > 0.0) {
                        startAlt = tel.altitude();
                    }
                    if (tel.heading() != null) {
                        startHeading = tel.heading();
                    }
                    if (tel.batteryPercentage() != null && tel.batteryPercentage() > 0.0) {
                        startBattery = tel.batteryPercentage();
                    }
                }
            }

            SimulationSessionCreateVm createVm = new SimulationSessionCreateVm(
                    flight.id(), 15.0, 1.0, startBattery, null, flight.droneId(), waypoints, 1.0);
            SimulationSession entity = simulationMapper.toEntity(createVm);
            if (entity == null) {
                return null;
            }
            entity.setDroneId(flight.droneId());
            entity.setFlightId(flight.id());
            entity.setFlightPhase("TAKEOFF".equals(cmdType) ? "TAKEOFF" : "CRUISE");
            entity.setTickRate(1.0);
            entity.setWaypoints(waypoints);
            entity.setStatus(SimulationStatus.RUNNING);
            entity.setSpeed(15.0);
            entity.setTimeScale(1.0);
            entity.setCurrentLat(startLat);
            entity.setCurrentLon(startLon);
            entity.setCurrentAlt(startAlt);
            entity.setCurrentHeading(startHeading);
            entity.setCurrentBattery(startBattery);
            entity.setTotalDistance(totalDist);

            SimulationSession saved = sessionRepository.saveAndFlush(entity);
            SimulationSessionRuntime runtime = new SimulationSessionRuntime(
                    saved,
                    waypoints,
                    extractCurrentBearerToken(),
                    flight.departureHubId(),
                    flight.arrivalHubId(),
                    flight.cruisingAltitudeM());
            runtime.currentLat = startLat;
            runtime.currentLon = startLon;
            runtime.currentAlt = startAlt;
            runtime.currentHeading = startHeading;
            runtime.currentBattery = startBattery;
            runtime.lastReportedBattery = startBattery;

            SimulationSessionRuntime prev = activeRuntimes.putIfAbsent(saved.getId(), runtime);
            if (prev != null) {
                return prev;
            }
            runtime.scheduledFuture = scheduler.scheduleAtFixedRate(
                    () -> runSimulationTick(runtime),
                    1000L,
                    1000L,
                    TimeUnit.MILLISECONDS);
            log.info("Auto-attached on-demand simulation runtime '{}' for flight '{}' on C2 command {}",
                    saved.getId(), flight.id(), cmdType);
            return runtime;
        } catch (Exception ex) {
            log.warn("Failed to auto-attach simulation runtime for command {}: {}", cmdType, ex.getMessage());
            return null;
        }
    }

    void stepSessionOnce(String sessionId) {
        SimulationSessionRuntime runtime = activeRuntimes.get(sessionId);
        if (runtime != null) {
            runSimulationTick(runtime);
        }
    }

    private SimulationSessionRuntime findActiveRuntime(String flightId, String droneId) {
        if (flightId != null && !flightId.isBlank()) {
            for (SimulationSessionRuntime rt : activeRuntimes.values()) {
                if (flightId.equals(rt.flightId)) {
                    return rt;
                }
            }
        }
        if (droneId != null && !droneId.isBlank()) {
            for (SimulationSessionRuntime rt : activeRuntimes.values()) {
                if (droneId.equals(rt.droneId)) {
                    return rt;
                }
            }
        }
        return null;
    }

    private JsonNode parseCommandParameters(String parametersJson) {
        if (parametersJson == null || parametersJson.isBlank() || objectMapper == null) {
            return null;
        }
        try {
            return objectMapper.readTree(parametersJson);
        } catch (Exception ex) {
            log.debug("Failed to parse command parameters JSON: {}", ex.getMessage());
            return null;
        }
    }

    private Double extractDouble(JsonNode node, String... fieldNames) {
        if (node == null || !node.isObject()) {
            return null;
        }
        for (String field : fieldNames) {
            JsonNode val = node.get(field);
            if (val != null && val.isNumber()) {
                return val.asDouble();
            }
            if (val != null && val.isTextual()) {
                try {
                    return Double.parseDouble(val.asText().trim());
                } catch (NumberFormatException ignored) {
                }
            }
        }
        return null;
    }

    private void autoClearScenarioIfMatches(String sessionId, String expectedScenario) {
        SimulationSessionRuntime runtime = activeRuntimes.get(sessionId);
        if (runtime == null) {
            return;
        }
        RuntimeSnapshot snapshot = null;
        runtime.lock.lock();
        try {
            if (!expectedScenario.equalsIgnoreCase(runtime.activeScenario)) {
                return;
            }
            runtime.activeScenario = null;
            runtime.scenarioConfig = null;
            runtime.scenarioClearFuture = null;
            runtime.c2LostSeconds = 0.0;
            runtime.failsafeRerouteActive = false;
            if (runtime.currentBattery > 0.0) {
                runtime.speed = runtime.cruiseSpeed;
            }
            snapshot = runtime.snapshot();
        } finally {
            runtime.lock.unlock();
        }

        persistRuntimeState(snapshot);
        recordEvent(sessionId, "SCENARIO_CLEARED", expectedScenario,
                "Emergency scenario duration elapsed. Restored normal flight parameters.", "LOW", null);
        log.info("Auto-cleared scenario '{}' for simulation session '{}' after configured duration",
                expectedScenario, sessionId);
    }

    private Map<String, Object> parseCommandParametersAsMap(String parametersJson) {
        if (parametersJson == null || parametersJson.isBlank() || objectMapper == null) {
            return null;
        }
        try {
            return objectMapper.readValue(parametersJson, new TypeReference<Map<String, Object>>() {
            });
        } catch (Exception ex) {
            return Map.of("raw", parametersJson);
        }
    }

    private double extractDoubleParam(Map<String, Object> config, double defaultValue, String... keys) {
        if (config == null || config.isEmpty()) {
            return defaultValue;
        }
        for (String key : keys) {
            Object raw = config.get(key);
            if (raw instanceof Number num) {
                return num.doubleValue();
            }
            if (raw instanceof String str && !str.isBlank()) {
                try {
                    return Double.parseDouble(str.trim());
                } catch (NumberFormatException ignored) {
                }
            }
        }
        return defaultValue;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractTriggerMap(Map<String, Object> config) {
        if (config == null || config.isEmpty()) {
            return null;
        }
        Object raw = config.get("trigger");
        if (raw instanceof Map<?, ?> map && !map.isEmpty()) {
            return (Map<String, Object>) map;
        }
        return null;
    }

    static boolean evaluateScenarioTrigger(
            Map<String, Object> trigger,
            double elapsedSeconds,
            int currentSegment,
            double batteryLevel,
            double currentLat,
            double currentLon) {
        if (trigger == null || trigger.isEmpty()) {
            return true;
        }
        Object typeObj = trigger.get("type");
        Object valObj = trigger.get("value");
        if (!(typeObj instanceof String typeStr) || valObj == null) {
            return false;
        }
        return switch (typeStr.trim().toLowerCase(Locale.ROOT)) {
            case "time" -> {
                Double target = toNumeric(valObj);
                yield target != null && elapsedSeconds >= target;
            }
            case "waypoint" -> {
                Double target = toNumeric(valObj);
                yield target != null && currentSegment >= target.intValue();
            }
            case "battery" -> {
                Double target = toNumeric(valObj);
                yield target != null && batteryLevel <= target;
            }
            case "position" -> {
                if (valObj instanceof Map<?, ?> posMap) {
                    Double lat = toNumeric(posMap.get("lat") != null ? posMap.get("lat") : posMap.get("latitude"));
                    Double lon = toNumeric(posMap.get("lon") != null ? posMap.get("lon")
                            : (posMap.get("lng") != null ? posMap.get("lng") : posMap.get("longitude")));
                    if (lat != null && lon != null) {
                        yield calculateHaversineDistance(currentLat, currentLon, lat, lon) < 50.0;
                    }
                }
                yield false;
            }
            default -> false;
        };
    }

    private static Double toNumeric(Object value) {
        if (value instanceof Number n) {
            return n.doubleValue();
        }
        if (value instanceof String s && !s.isBlank()) {
            try {
                return Double.parseDouble(s.trim());
            } catch (NumberFormatException ignored) {
            }
        }
        return null;
    }

    private Long extractDurationSeconds(Map<String, Object> config) {
        if (config == null || config.isEmpty()) {
            return null;
        }
        Object raw = config.get("durationSeconds");
        if (raw == null) {
            raw = config.get("lossDurationSeconds");
        }
        if (raw == null) {
            raw = config.get("reconnectionTimeoutSeconds");
        }
        if (raw instanceof Number num) {
            long value = num.longValue();
            return value > 0 ? value : null;
        }
        if (raw instanceof String str && !str.isBlank()) {
            try {
                long value = Long.parseLong(str.trim());
                return value > 0 ? value : null;
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private void runSimulationTick(SimulationSessionRuntime runtime) {
        try {
            TelemetryPushVm telemetryPush = null;
            RuntimeSnapshot snapshotToPersist = null;
            PendingEvent pendingEvent = null;
            PendingEvent failsafeEvent = null;
            List<PendingAck> pendingAcks = new ArrayList<>();
            String completionLandingHubId = null;
            String terminalLog = null;

            runtime.lock.lock();
            try {
                if (runtime.status != SimulationStatus.RUNNING) {
                    return;
                }

                if (runtime.pendingScenario != null && runtime.pendingTrigger != null) {
                    boolean fired = evaluateScenarioTrigger(
                            runtime.pendingTrigger,
                            runtime.elapsedSimSeconds,
                            runtime.currentSegment,
                            runtime.currentBattery,
                            runtime.currentLat,
                            runtime.currentLon);
                    if (fired) {
                        String triggeredCode = runtime.pendingScenario;
                        Map<String, Object> triggeredCfg = runtime.pendingScenarioConfig;
                        runtime.activeScenario = triggeredCode;
                        runtime.scenarioConfig = triggeredCfg;
                        runtime.pendingScenario = null;
                        runtime.pendingScenarioConfig = null;
                        runtime.pendingTrigger = null;
                        runtime.operatorOverride = false;
                        if ("c2_lost".equalsIgnoreCase(triggeredCode)) {
                            runtime.c2LostSeconds = 0.0;
                            runtime.failsafeRerouteActive = false;
                            runtime.speed = 0.0;
                        }
                        Long durSec = extractDurationSeconds(triggeredCfg);
                        if (durSec != null && durSec > 0) {
                            runtime.scenarioClearFuture = scheduler.schedule(
                                    () -> autoClearScenarioIfMatches(runtime.sessionId, triggeredCode),
                                    durSec,
                                    TimeUnit.SECONDS);
                        }
                        snapshotToPersist = runtime.snapshot();
                        pendingEvent = new PendingEvent(
                                runtime.sessionId,
                                "SCENARIO_TRIGGERED",
                                triggeredCode,
                                "Conditional emergency scenario '" + triggeredCode + "' triggered during flight",
                                "HIGH",
                                triggeredCfg);
                    }
                }

                if (runtime.currentBattery <= 0.0) {
                    runtime.status = SimulationStatus.STOPPED;
                    runtime.cancelFutures(false);
                    activeRuntimes.remove(runtime.sessionId);
                    snapshotToPersist = runtime.snapshot();
                    runtime.drainActiveCommandsToAcks(pendingAcks, "FAILED",
                            "Battery depleted to 0% before command completion");
                    pendingEvent = new PendingEvent(
                            runtime.sessionId,
                            "BATTERY_EXHAUSTED",
                            runtime.activeScenario,
                            "Drone battery depleted to 0.0%. Flight simulation stopped and telemetry downlink severed.",
                            "CRITICAL",
                            null);
                    terminalLog = "Simulation session '" + runtime.sessionId + "' stopped: battery depleted for drone '"
                            + runtime.droneId + "'";
                } else {
                    boolean c2Severed = "c2_lost".equalsIgnoreCase(runtime.activeScenario) && !runtime.operatorOverride;
                    boolean sendTelemetry = !c2Severed && runtime.currentBattery > 0.0;

                    if (runtime.ackPendingOnNextTick && !runtime.activeCommandIds.isEmpty()) {
                        runtime.drainActiveCommandsToAcks(pendingAcks, "COMPLETED",
                                "C2 command " + runtime.activeCommandType + " active on flight controller");
                        runtime.ackPendingOnNextTick = false;
                    }

                    double timeStepSeconds = 1.0 * runtime.timeScale;
                    boolean loiteringOnC2Loss = c2Severed
                            && !runtime.failsafeRerouteActive
                            && !runtime.forcedDescentActive;

                    double segHorizSpeed = 0.0;
                    double segVertSpeed = 0.0;
                    if (runtime.forcedDescentActive) {
                        segHorizSpeed = 0.0;
                        segVertSpeed = -runtime.forcedDescentRateMps;
                    } else if ("motor_failure".equalsIgnoreCase(runtime.activeScenario)) {
                        segHorizSpeed = Math.max(3.0, runtime.speed * 0.8);
                        segVertSpeed = -Math.max(1.0, extractDoubleParam(runtime.scenarioConfig, 8.0, "descentRateMps"));
                    } else if (!loiteringOnC2Loss && !runtime.holdingByCommand && runtime.remainingHoverSeconds <= 0.0
                            && runtime.currentSegment + 1 < runtime.waypoints.size()) {
                        WaypointVm p1 = runtime.waypoints.get(runtime.currentSegment);
                        WaypointVm p2 = runtime.waypoints.get(runtime.currentSegment + 1);
                        double h = calculateHaversineDistance(p1.lat(), p1.lon(), p2.lat(), p2.lon());
                        double dz = p2.alt() - p1.alt();
                        double len3d = Math.max(0.001, Math.hypot(h, Math.abs(dz)));
                        double spd3d = runtime.targetSpeedForCurrentSegment();
                        segHorizSpeed = h <= 1.0 ? 0.0 : spd3d * (h / len3d);
                        segVertSpeed = spd3d * (dz / len3d);
                    }
                    if (runtime.targetAltitudeOverride != null && !runtime.forcedDescentActive
                            && !"motor_failure".equalsIgnoreCase(runtime.activeScenario)) {
                        double altDelta = runtime.targetAltitudeOverride - runtime.currentAlt;
                        segVertSpeed = Math.abs(altDelta) > 0.5 ? Math.signum(altDelta) * 4.0 : 0.0;
                    }

                    String flightMode = runtime.emergencyStopActive ? "EMERGENCY_STOP"
                            : runtime.forcedDescentActive ? "LANDING"
                            : runtime.rtlActive ? "RTL"
                            : runtime.takeoffClimbActive ? "TAKEOFF"
                            : runtime.holdingByCommand ? "LOITER"
                            : (runtime.activeScenario != null && !runtime.operatorOverride) ? "CONTINGENCY"
                            : "AUTONOMOUS";

                    if (sendTelemetry) {
                        runtime.lastReportedBattery = runtime.currentBattery;
                        double effectiveLat = runtime.currentLat;
                        double effectiveLon = runtime.currentLon;
                        double effectiveAlt = runtime.currentAlt;
                        double effectiveHeading = runtime.currentHeading;
                        double effectiveSpeed = segHorizSpeed;

                        double noiseDistMeters = ThreadLocalRandom.current().nextGaussian() * 0.5;
                        double noiseLat = (noiseDistMeters / EARTH_RADIUS_METERS) * (180.0 / Math.PI);
                        double noiseLon = (noiseDistMeters
                                / (EARTH_RADIUS_METERS * Math.cos(Math.toRadians(effectiveLat))))
                                * (180.0 / Math.PI);
                        double noiseAlt = runtime.currentAlt <= 0.2 ? 0.0 : ThreadLocalRandom.current().nextGaussian() * 0.25;
                        double noiseHeading = ThreadLocalRandom.current().nextGaussian() * 1.0;
                        double noiseSpeed = segHorizSpeed <= 0.1 ? 0.0 : ThreadLocalRandom.current().nextGaussian() * 0.1;

                        effectiveLat += noiseLat;
                        effectiveLon += noiseLon;
                        effectiveAlt = Math.max(0.0, effectiveAlt + noiseAlt);
                        effectiveHeading = (effectiveHeading + noiseHeading + 360.0) % 360.0;
                        effectiveSpeed = Math.max(0.0, effectiveSpeed + noiseSpeed);

                        if (!runtime.operatorOverride) {
                            if ("gps_failure".equalsIgnoreCase(runtime.activeScenario)) {
                                double driftMeters = Math.max(5.0, extractDoubleParam(runtime.scenarioConfig, 55.0, "driftDistanceMeters"));
                                double angle = ThreadLocalRandom.current().nextDouble() * 2.0 * Math.PI;
                                double radius = ThreadLocalRandom.current().nextDouble() * driftMeters;
                                effectiveLat += (radius * Math.cos(angle) / EARTH_RADIUS_METERS) * (180.0 / Math.PI);
                                effectiveLon += (radius * Math.sin(angle)
                                        / (EARTH_RADIUS_METERS * Math.cos(Math.toRadians(runtime.currentLat))))
                                        * (180.0 / Math.PI);
                            } else if ("geofence_breach".equalsIgnoreCase(runtime.activeScenario)) {
                                double perpHeading = Math.toRadians((runtime.currentHeading + 90.0) % 360.0);
                                double driftDist = Math.max(10.0, extractDoubleParam(runtime.scenarioConfig, 75.0, "deviationMeters"));
                                effectiveLat += (driftDist * Math.cos(perpHeading) / EARTH_RADIUS_METERS)
                                        * (180.0 / Math.PI);
                                effectiveLon += (driftDist * Math.sin(perpHeading)
                                        / (EARTH_RADIUS_METERS * Math.cos(Math.toRadians(runtime.currentLat))))
                                        * (180.0 / Math.PI);
                            }
                        }

                        double sigStrength = c2Severed ? 0.0
                                : Math.max(45.0, Math.min(100.0, 96.0 - (runtime.cumulativeTraveled / 2000.0)));
                        double hdop = (!runtime.operatorOverride && "gps_failure".equalsIgnoreCase(runtime.activeScenario)) ? 6.5 : 0.9;
                        int sats = (!runtime.operatorOverride && "gps_failure".equalsIgnoreCase(runtime.activeScenario)) ? 3 : 14;

                        telemetryPush = new TelemetryPushVm(
                                runtime.droneId,
                                runtime.flightId,
                                Math.round(effectiveLat * 1e7) / 1e7,
                                Math.round(effectiveLon * 1e7) / 1e7,
                                Math.round(effectiveAlt * 10.0) / 10.0,
                                Math.round(effectiveSpeed * 10.0) / 10.0,
                                Math.round(effectiveHeading * 10.0) / 10.0,
                                0.0,
                                0.0,
                                Math.round(effectiveHeading * 10.0) / 10.0,
                                Math.round(runtime.currentBattery * 10.0) / 10.0,
                                ZonedDateTime.now(),
                                Math.round(segVertSpeed * 10.0) / 10.0,
                                Math.round(sigStrength * 10.0) / 10.0,
                                hdop,
                                sats,
                                flightMode,
                                "simulation");
                    }

                    if (runtime.isFinished()) {
                        if ("GOTO".equals(runtime.activeCommandType) && runtime.currentAlt > 2.0 && !runtime.rtlActive) {
                            runtime.holdingByCommand = true;
                            runtime.speed = 0.0;
                            runtime.drainActiveCommandsToAcks(pendingAcks, "COMPLETED",
                                    "Reached GOTO coordinates; holding position");
                            snapshotToPersist = runtime.snapshot();
                        } else {
                            boolean wasRtl = runtime.rtlActive;
                            runtime.currentAlt = wasRtl ? 0.0 : runtime.currentAlt;
                            runtime.speed = 0.0;
                            runtime.status = SimulationStatus.COMPLETED;
                            runtime.cancelFutures(false);
                            activeRuntimes.remove(runtime.sessionId);
                            snapshotToPersist = runtime.snapshot();
                            completionLandingHubId = wasRtl ? runtime.departureHubId : runtime.arrivalHubId;
                            runtime.drainActiveCommandsToAcks(pendingAcks, "COMPLETED",
                                    wasRtl ? "RTH touchdown completed at departure hub (0m AGL)"
                                            : "Flight maneuver completed");
                            if (sendTelemetry) {
                                telemetryPush = buildTouchdownTelemetry(runtime);
                            }
                            pendingEvent = new PendingEvent(
                                    runtime.sessionId,
                                    "SESSION_COMPLETED",
                                    null,
                                    wasRtl ? "Return-to-home touchdown completed at departure hub"
                                            : "Flight simulation completed at final waypoint",
                                    "LOW",
                                    null);
                            terminalLog = "Simulation session '" + runtime.sessionId
                                    + (wasRtl ? "' completed RTH landing at departure hub"
                                            : "' completed flight path successfully");
                        }
                    } else {
                        double stepDist = 0.0;
                        boolean crashed = false;

                        if (runtime.forcedDescentActive) {
                            runtime.speed = 0.0;
                            runtime.currentAlt = Math.max(0.0,
                                    runtime.currentAlt - (runtime.forcedDescentRateMps * timeStepSeconds));
                            if (runtime.currentAlt <= 0.0) {
                                boolean isEstop = runtime.emergencyStopActive;
                                String landedHubId = isEstop ? null : runtime.resolveNearbyHubId(120.0);
                                runtime.status = (landedHubId != null) ? SimulationStatus.COMPLETED : SimulationStatus.STOPPED;
                                runtime.cancelFutures(false);
                                activeRuntimes.remove(runtime.sessionId);
                                snapshotToPersist = runtime.snapshot();
                                runtime.drainActiveCommandsToAcks(pendingAcks, "COMPLETED",
                                        isEstop ? "Emergency stop touchdown completed at 0m AGL"
                                                : "Controlled vertical landing completed at 0m AGL");
                                if (sendTelemetry) {
                                    telemetryPush = buildTouchdownTelemetry(runtime);
                                }
                                if (landedHubId != null) {
                                    completionLandingHubId = landedHubId;
                                    pendingEvent = new PendingEvent(
                                            runtime.sessionId,
                                            "SESSION_COMPLETED",
                                            null,
                                            "Controlled vertical landing completed at hub (0m AGL)",
                                            "LOW",
                                            null);
                                    terminalLog = "Simulation session '" + runtime.sessionId
                                            + "' completed controlled landing at hub '" + landedHubId + "'";
                                } else {
                                    pendingEvent = new PendingEvent(
                                            runtime.sessionId,
                                            "EMERGENCY_LANDED",
                                            runtime.activeScenario,
                                            runtime.forcedDescentReason != null
                                                    ? runtime.forcedDescentReason + " - touchdown completed at alt 0m"
                                                    : "Emergency vertical landing completed at ground level",
                                            "HIGH",
                                            null);
                                    terminalLog = "Simulation session '" + runtime.sessionId
                                            + "' stopped: vertical landing completed for drone '" + runtime.droneId + "'";
                                }
                                crashed = true;
                            }
                        } else if ("motor_failure".equalsIgnoreCase(runtime.activeScenario)) {
                            double descentRate = Math.max(1.0, extractDoubleParam(runtime.scenarioConfig, 8.0, "descentRateMps"));
                            runtime.speed = Math.max(3.0, runtime.speed * 0.8);
                            runtime.currentAlt = Math.max(0.0, runtime.currentAlt - (descentRate * timeStepSeconds));
                            if (runtime.currentAlt <= 0.0) {
                                runtime.speed = 0.0;
                                runtime.status = SimulationStatus.STOPPED;
                                runtime.cancelFutures(false);
                                activeRuntimes.remove(runtime.sessionId);
                                snapshotToPersist = runtime.snapshot();
                                runtime.drainActiveCommandsToAcks(pendingAcks, "FAILED",
                                        "Drone grounded due to motor failure");
                                pendingEvent = new PendingEvent(
                                        runtime.sessionId,
                                        "MOTOR_CRASH",
                                        runtime.activeScenario,
                                        "Drone reached ground after motor failure. Flight simulation stopped.",
                                        "CRITICAL",
                                        null);
                                terminalLog = "Simulation session '" + runtime.sessionId
                                        + "' stopped: drone grounded due to motor failure";
                                crashed = true;
                            }
                        }

                        if (!crashed) {
                            if (c2Severed) {
                                runtime.c2LostSeconds += timeStepSeconds;
                                double failsafeTimeoutSec = Math.max(5.0, extractDoubleParam(
                                        runtime.scenarioConfig, 25.0,
                                        "reconnectionTimeoutSeconds", "failsafeTimeoutSeconds"));
                                if (!runtime.failsafeRerouteActive && !runtime.forcedDescentActive
                                        && runtime.c2LostSeconds >= failsafeTimeoutSec) {
                                    String actionCfg = (runtime.scenarioConfig != null
                                            && runtime.scenarioConfig.get("failsafeAction") instanceof String s
                                            && !s.isBlank())
                                                    ? s.trim().toUpperCase(Locale.ROOT)
                                                    : "RTL";
                                    if ("LAND".equals(actionCfg) || runtime.currentBattery <= 15.0) {
                                        runtime.forcedDescentActive = true;
                                        runtime.forcedDescentRateMps = 3.5;
                                        runtime.forcedDescentReason = "Onboard C2 link-loss failsafe vertical landing";
                                        runtime.holdingByCommand = false;
                                        runtime.speed = 0.0;
                                        failsafeEvent = new PendingEvent(
                                                runtime.sessionId,
                                                "ONBOARD_FAILSAFE_ACTIVATED",
                                                runtime.activeScenario,
                                                "Onboard autopilot activated LAND failsafe after "
                                                        + Math.round(runtime.c2LostSeconds) + "s of C2 link loss",
                                                "HIGH",
                                                null);
                                    } else {
                                        runtime.failsafeRerouteActive = true;
                                        runtime.rtlActive = true;
                                        runtime.holdingByCommand = false;
                                        runtime.forcedDescentActive = false;
                                        runtime.targetAltitudeOverride = null;
                                        runtime.speed = runtime.cruiseSpeed;
                                        double safeRtlAlt = Math.max(runtime.currentAlt, Math.max(runtime.defaultCruiseAlt, 40.0));
                                        List<WaypointVm> failsafeRtl = new ArrayList<>();
                                        failsafeRtl.add(new WaypointVm(runtime.currentLat, runtime.currentLon, runtime.currentAlt));
                                        if (calculateHaversineDistance(runtime.currentLat, runtime.currentLon,
                                                runtime.homePadWaypoint.lat(), runtime.homePadWaypoint.lon()) > 15.0) {
                                            failsafeRtl.add(new WaypointVm(runtime.homePadWaypoint.lat(),
                                                    runtime.homePadWaypoint.lon(), safeRtlAlt, runtime.cruiseSpeed, 0, null));
                                        }
                                        failsafeRtl.add(new WaypointVm(runtime.homePadWaypoint.lat(),
                                                runtime.homePadWaypoint.lon(), 0.0, 3.5, 0, null));
                                        runtime.reroutePath(failsafeRtl);
                                        failsafeEvent = new PendingEvent(
                                                runtime.sessionId,
                                                "ONBOARD_FAILSAFE_ACTIVATED",
                                                runtime.activeScenario,
                                                "Onboard autopilot activated RTL failsafe to departure hub after "
                                                        + Math.round(runtime.c2LostSeconds) + "s of C2 link loss",
                                                "HIGH",
                                                null);
                                    }
                                    snapshotToPersist = runtime.snapshot();
                                }
                            }

                            loiteringOnC2Loss = c2Severed
                                    && !runtime.failsafeRerouteActive
                                    && !runtime.forcedDescentActive;

                            if (loiteringOnC2Loss || runtime.holdingByCommand || runtime.forcedDescentActive) {
                                runtime.speed = 0.0;
                                stepDist = 0.0;
                            } else if (runtime.remainingHoverSeconds > 0.0) {
                                runtime.speed = 0.0;
                                stepDist = 0.0;
                                runtime.remainingHoverSeconds = Math.max(0.0, runtime.remainingHoverSeconds - timeStepSeconds);
                            } else if (!"motor_failure".equalsIgnoreCase(runtime.activeScenario)) {
                                double targetSpeed = runtime.targetSpeedForCurrentSegment();
                                if (runtime.currentBattery > 0.0) {
                                    runtime.speed = targetSpeed;
                                    stepDist = targetSpeed * timeStepSeconds;
                                }
                            }

                            if ("battery_drain".equalsIgnoreCase(runtime.activeScenario)) {
                                double drainRate = Math.max(0.5, extractDoubleParam(
                                        runtime.scenarioConfig, 5.0, "dischargeRatePerSecond", "dischargeRate"));
                                double targetRemaining = Math.max(0.0, extractDoubleParam(
                                        runtime.scenarioConfig, 0.0, "targetRemainingPercent"));
                                double floor = Math.min(targetRemaining, runtime.currentBattery);
                                runtime.currentBattery = Math.max(floor, runtime.currentBattery - (drainRate * timeStepSeconds));
                            } else {
                                runtime.currentBattery = Math.max(0.0,
                                        runtime.currentBattery - (0.012 * Math.min(timeStepSeconds, 2.0)));
                            }
                            if (runtime.currentBattery <= 5.0) {
                                runtime.currentAlt = Math.max(0.0, runtime.currentAlt - (3.0 * timeStepSeconds));
                                if (runtime.currentAlt <= 0.0) {
                                    runtime.speed = 0.0;
                                }
                            } else if (runtime.targetAltitudeOverride != null && !runtime.forcedDescentActive
                                     && !"motor_failure".equalsIgnoreCase(runtime.activeScenario)) {
                                double delta = runtime.targetAltitudeOverride - runtime.currentAlt;
                                double maxStep = 4.0 * timeStepSeconds;
                                if (Math.abs(delta) <= maxStep) {
                                    runtime.currentAlt = runtime.targetAltitudeOverride;
                                    snapshotToPersist = runtime.snapshot();
                                    if ("SET_ALTITUDE".equals(runtime.activeCommandType)) {
                                        runtime.drainActiveCommandsToAcks(pendingAcks, "COMPLETED",
                                                "Reached commanded altitude " + runtime.targetAltitudeOverride + "m");
                                    }
                                } else {
                                    runtime.currentAlt += Math.signum(delta) * maxStep;
                                }
                            }

                            if (runtime.currentBattery <= 0.0
                                    || (runtime.currentBattery <= 5.0 && runtime.currentAlt <= 0.0)) {
                                runtime.status = SimulationStatus.STOPPED;
                                runtime.cancelFutures(false);
                                activeRuntimes.remove(runtime.sessionId);
                                snapshotToPersist = runtime.snapshot();
                                runtime.drainActiveCommandsToAcks(pendingAcks, "FAILED",
                                        "Battery exhausted before completing command");
                                pendingEvent = new PendingEvent(
                                        runtime.sessionId,
                                        "BATTERY_EXHAUSTED",
                                        runtime.activeScenario,
                                        "Drone battery depleted to 0.0%. Flight simulation stopped and telemetry downlink severed.",
                                        "CRITICAL",
                                        null);
                                terminalLog = "Simulation session '" + runtime.sessionId
                                        + "' stopped: battery depleted for drone '" + runtime.droneId + "'";
                            } else {
                                runtime.advance(stepDist);
                                if (runtime.takeoffClimbActive
                                        && (runtime.currentSegment >= 1 || runtime.currentAlt >= runtime.defaultCruiseAlt - 0.5)) {
                                    runtime.takeoffClimbActive = false;
                                    snapshotToPersist = runtime.snapshot();
                                    if ("TAKEOFF".equals(runtime.activeCommandType)) {
                                        runtime.drainActiveCommandsToAcks(pendingAcks, "COMPLETED",
                                                "Takeoff climb completed; transitioning to autonomous cruise");
                                    }
                                }
                                runtime.elapsedSimSeconds += timeStepSeconds;
                                runtime.tickCount++;
                                if (runtime.tickCount % 5 == 0) {
                                    snapshotToPersist = runtime.snapshot();
                                }
                            }
                        }
                    }
                }
            } finally {
                runtime.lock.unlock();
            }

            String effectiveToken = resolveRuntimeBearerToken(runtime);
            if (telemetryPush != null) {
                if (effectiveToken != null && !effectiveToken.isBlank()) {
                    telemetryClientService.pushTelemetry(telemetryPush, effectiveToken);
                } else {
                    telemetryClientService.pushTelemetry(telemetryPush);
                }
            }
            for (PendingAck ack : pendingAcks) {
                publishCommandAck(
                        ack.commandId(),
                        ack.droneId(),
                        ack.flightId(),
                        ack.commandType(),
                        ack.status(),
                        ack.message());
            }
            if (snapshotToPersist != null) {
                persistRuntimeState(snapshotToPersist);
            }
            if (failsafeEvent != null) {
                recordEvent(
                        failsafeEvent.sessionId(),
                        failsafeEvent.eventType(),
                        failsafeEvent.scenario(),
                        failsafeEvent.message(),
                        failsafeEvent.severity(),
                        failsafeEvent.configJson());
            }
            if (pendingEvent != null) {
                recordEvent(
                        pendingEvent.sessionId(),
                        pendingEvent.eventType(),
                        pendingEvent.scenario(),
                        pendingEvent.message(),
                        pendingEvent.severity(),
                        pendingEvent.configJson());
                if ("SESSION_COMPLETED".equals(pendingEvent.eventType()) && runtime.flightId != null) {
                    if (completionLandingHubId != null && !completionLandingHubId.isBlank()) {
                        flightClientService.completeFlight(runtime.flightId, completionLandingHubId, effectiveToken);
                    } else if (effectiveToken != null && !effectiveToken.isBlank()) {
                        flightClientService.completeFlight(runtime.flightId, effectiveToken);
                    } else {
                        flightClientService.completeFlight(runtime.flightId);
                    }
                } else if (("MOTOR_CRASH".equals(pendingEvent.eventType())
                        || "BATTERY_EXHAUSTED".equals(pendingEvent.eventType())
                        || "EMERGENCY_LANDED".equals(pendingEvent.eventType()))
                        && runtime.flightId != null) {
                    if (effectiveToken != null && !effectiveToken.isBlank()) {
                        flightClientService.abortFlight(runtime.flightId, pendingEvent.message(), effectiveToken);
                    } else {
                        flightClientService.abortFlight(runtime.flightId, pendingEvent.message());
                    }
                }
                if (terminalLog != null) {
                    if ("CRITICAL".equals(pendingEvent.severity())) {
                        log.warn(terminalLog);
                    } else {
                        log.info(terminalLog);
                    }
                }
            }
        } catch (Exception ex) {
            log.error("Error in simulation tick for session '{}': {}", runtime.sessionId, ex.getMessage(), ex);
        }
    }

    private TelemetryPushVm buildTouchdownTelemetry(SimulationSessionRuntime runtime) {
        return new TelemetryPushVm(
                runtime.droneId,
                runtime.flightId,
                Math.round(runtime.currentLat * 1e7) / 1e7,
                Math.round(runtime.currentLon * 1e7) / 1e7,
                0.0,
                0.0,
                Math.round(runtime.currentHeading * 10.0) / 10.0,
                0.0,
                0.0,
                Math.round(runtime.currentHeading * 10.0) / 10.0,
                Math.round(runtime.currentBattery * 10.0) / 10.0,
                ZonedDateTime.now(),
                0.0,
                96.0,
                0.9,
                14,
                "LANDED",
                "simulation");
    }

    private String resolveRuntimeBearerToken(SimulationSessionRuntime runtime) {
        if (systemTokenService != null) {
            String sysToken = systemTokenService.getSystemToken();
            if (sysToken != null && !sysToken.isBlank()) {
                return sysToken;
            }
        }
        return runtime != null ? runtime.bearerToken : null;
    }

    private void persistRuntimeState(RuntimeSnapshot snapshot) {
        try {
            sessionRepository.findById(snapshot.sessionId()).ifPresent(s -> {
                s.setStatus(snapshot.status());
                boolean isC2Loitering = "c2_lost".equalsIgnoreCase(snapshot.activeScenario())
                        && !snapshot.failsafeRerouteActive();
                s.setSpeed(isC2Loitering ? 0.0 : snapshot.speed());
                s.setTimeScale(snapshot.timeScale());
                s.setCurrentLat(snapshot.currentLat());
                s.setCurrentLon(snapshot.currentLon());
                s.setCurrentAlt(snapshot.currentAlt());
                s.setCurrentHeading(snapshot.currentHeading());
                s.setCurrentBattery("c2_lost".equalsIgnoreCase(snapshot.activeScenario())
                        ? snapshot.lastReportedBattery()
                        : snapshot.currentBattery());
                s.setProgress(snapshot.progress());
                s.setTraveledDistance(snapshot.cumulativeTraveled());
                s.setCurrentSegment(snapshot.currentSegment());
                s.setActiveScenario(snapshot.activeScenario());
                String phase = computeFlightPhase(snapshot);
                s.setFlightPhase(phase);
                sessionRepository.save(s);
            });
        } catch (Exception ex) {
            log.warn("Failed to persist simulation state for session '{}': {}", snapshot.sessionId(), ex.getMessage());
        }
    }

    static String computeFlightPhase(RuntimeSnapshot snapshot) {
        if (snapshot.status() == SimulationStatus.COMPLETED) {
            return "LANDED";
        }
        if (snapshot.activeScenario() != null) {
            return "EMERGENCY";
        }
        if (snapshot.speed() <= 0.1) {
            return "HOVER";
        }
        if (snapshot.progress() < 3.0) {
            return "TAKEOFF";
        }
        if (snapshot.progress() < 12.0) {
            return "CLIMB";
        }
        if (snapshot.progress() > 95.0) {
            return "LANDING";
        }
        if (snapshot.progress() > 86.0) {
            return "DESCENT";
        }
        return "CRUISE";
    }

    private SimulationSession syncWithRuntime(SimulationSession session) {
        SimulationSessionRuntime runtime = activeRuntimes.get(session.getId());
        if (runtime == null) {
            return session;
        }
        RuntimeSnapshot snapshot;
        runtime.lock.lock();
        try {
            snapshot = runtime.snapshot();
        } finally {
            runtime.lock.unlock();
        }

        boolean isC2Loitering = "c2_lost".equalsIgnoreCase(snapshot.activeScenario())
                && !snapshot.failsafeRerouteActive();
        SimulationSession detachedCopy = simulationMapper.copyWithRuntime(
                session,
                snapshot.status(),
                isC2Loitering ? 0.0 : snapshot.speed(),
                snapshot.timeScale(),
                snapshot.currentLat(),
                snapshot.currentLon(),
                snapshot.currentAlt(),
                snapshot.currentHeading(),
                "c2_lost".equalsIgnoreCase(snapshot.activeScenario())
                        ? snapshot.lastReportedBattery()
                        : snapshot.currentBattery(),
                snapshot.progress(),
                snapshot.cumulativeTraveled(),
                snapshot.currentSegment(),
                snapshot.activeScenario());
        return detachedCopy != null ? detachedCopy : session;
    }

    private SimulationEvent recordEvent(String sessionId, String eventType, String scenario, String message,
            String severity, Map<String, Object> configJson) {
        SimulationEvent event = simulationMapper.toEventEntity(
                sessionId,
                eventType,
                scenario,
                message,
                severity,
                configJson);
        return eventRepository.save(event);
    }

    private List<WaypointVm> resolveWaypoints(FlightDetailVm flight) {
        if (flight != null) {
            if (flight.plannedRoute() != null && flight.plannedRoute().coordinates() != null
                    && flight.plannedRoute().coordinates().size() >= 2) {
                double defaultAlt = flight.cruisingAltitudeM() != null ? flight.cruisingAltitudeM() : 50.0;
                List<WaypointVm> structuredWps = flight.waypoints() != null ? flight.waypoints() : List.of();
                List<WaypointVm> extracted = new ArrayList<>();
                for (List<Double> coord : flight.plannedRoute().coordinates()) {
                    if (coord != null && coord.size() >= 2) {
                        double lon = coord.get(0);
                        double lat = coord.get(1);
                        double alt = coord.size() > 2 && coord.get(2) != null ? coord.get(2) : defaultAlt;
                        WaypointVm matched = findMatchingStructuredWaypoint(lat, lon, structuredWps);
                        extracted.add(new WaypointVm(
                                lat,
                                lon,
                                alt,
                                matched != null ? matched.speed() : null,
                                matched != null && matched.hoverDurationSec() != null ? matched.hoverDurationSec() : 0,
                                matched != null ? matched.headingAtWaypoint() : null));
                    }
                }
                if (extracted.size() >= 2) {
                    log.info("Resolved {} trajectory waypoints from Flight Plan '{}' GeoJSON planned_route",
                            extracted.size(), flight.id());
                    return extracted;
                }
            }

            if (flight.waypoints() != null && flight.waypoints().size() >= 2) {
                log.info("Resolved {} trajectory waypoints from Flight Plan '{}' waypoints list",
                        flight.waypoints().size(), flight.id());
                return flight.waypoints();
            }
        }

        throw new BadRequestException(MessageCode.INVALID_SIMULATION_WAYPOINTS, "reason",
                "Flight route has insufficient waypoints (min 2 required)");
    }

    private WaypointVm findMatchingStructuredWaypoint(double lat, double lon, List<WaypointVm> structured) {
        if (structured == null || structured.isEmpty()) {
            return null;
        }
        for (WaypointVm wp : structured) {
            if (wp != null && wp.lat() != null && wp.lon() != null
                    && calculateHaversineDistance(lat, lon, wp.lat(), wp.lon()) <= 15.0) {
                return wp;
            }
        }
        return null;
    }

    private double calculateTotalDistance(List<WaypointVm> waypoints) {
        double total = 0.0;
        for (int i = 0; i < waypoints.size() - 1; i++) {
            total += calculateHaversineDistance(
                    waypoints.get(i).lat(), waypoints.get(i).lon(),
                    waypoints.get(i + 1).lat(), waypoints.get(i + 1).lon());
        }
        return total;
    }

    private static double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double rLat1 = Math.toRadians(lat1);
        double rLat2 = Math.toRadians(lat2);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_METERS * c;
    }

    private static double calculateBearing(double lat1, double lon1, double lat2, double lon2) {
        double phi1 = Math.toRadians(lat1);
        double phi2 = Math.toRadians(lat2);
        double deltaLambda = Math.toRadians(lon2 - lon1);

        double y = Math.sin(deltaLambda) * Math.cos(phi2);
        double x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
        double theta = Math.atan2(y, x);
        return (Math.toDegrees(theta) + 360.0) % 360.0;
    }

    private List<String> getScenarioParams(EmergencyScenarioType type) {
        return switch (type) {
            case GPS_FAILURE -> List.of("driftDistanceMeters", "lossDurationSeconds");
            case BATTERY_DRAIN -> List.of("dischargeRatePerSecond", "targetRemainingPercent");
            case C2_LOST -> List.of("reconnectionTimeoutSeconds", "failsafeAction");
            case MOTOR_FAILURE -> List.of("failedMotorIndex", "descentRateMps");
            case GEOFENCE_BREACH -> List.of("breachZoneId", "deviationMeters");
        };
    }

    private String extractCurrentBearerToken() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwtAuth && jwtAuth.getToken() != null) {
            return jwtAuth.getToken().getTokenValue();
        }
        return null;
    }

    @PreDestroy
    public void cleanup() {
        scheduler.shutdownNow();
    }

    private record RuntimeSnapshot(
            String sessionId,
            String droneId,
            SimulationStatus status,
            double speed,
            double timeScale,
            double currentLat,
            double currentLon,
            double currentAlt,
            double currentHeading,
            double currentBattery,
            double lastReportedBattery,
            double progress,
            double cumulativeTraveled,
            int currentSegment,
            String activeScenario,
            boolean failsafeRerouteActive) {
    }

    private record PendingEvent(
            String sessionId,
            String eventType,
            String scenario,
            String message,
            String severity,
            Map<String, Object> configJson) {
    }

    private record PendingAck(
            String commandId,
            String droneId,
            String flightId,
            String commandType,
            String status,
            String message) {
    }

    private static class SimulationSessionRuntime {
        final ReentrantLock lock = new ReentrantLock();
        final String sessionId;
        final String droneId;
        final String flightId;
        final String bearerToken;
        final String departureHubId;
        final String arrivalHubId;
        final double defaultCruiseAlt;
        final List<WaypointVm> originalWaypoints;
        final List<WaypointVm> waypoints;
        final WaypointVm originWaypoint;
        final WaypointVm homePadWaypoint;
        final WaypointVm arrivalPadWaypoint;
        double totalDistance;
        final List<Double> segmentDistances;
        final double cruiseSpeed;

        SimulationStatus status;
        double speed;
        double timeScale;
        int currentSegment = 0;
        double distanceInSegment = 0.0;
        double cumulativeTraveled = 0.0;
        double currentLat;
        double currentLon;
        double currentAlt;
        double currentHeading;
        double currentBattery;
        double lastReportedBattery;
        String activeScenario;
        Map<String, Object> scenarioConfig;
        String pendingScenario;
        Map<String, Object> pendingScenarioConfig;
        Map<String, Object> pendingTrigger;
        double elapsedSimSeconds = 0.0;
        double remainingHoverSeconds = 0.0;
        boolean holdingByCommand = false;
        boolean forcedDescentActive = false;
        boolean emergencyStopActive = false;
        boolean failsafeRerouteActive = false;
        boolean rtlActive = false;
        boolean takeoffClimbActive = false;
        boolean operatorOverride = false;
        boolean ackPendingOnNextTick = false;
        final List<String> activeCommandIds = new ArrayList<>();
        String activeCommandType = null;
        double c2LostSeconds = 0.0;
        double forcedDescentRateMps = 3.5;
        String forcedDescentReason = null;
        Double targetAltitudeOverride = null;
        long tickCount = 0;
        volatile ScheduledFuture<?> scheduledFuture;
        volatile ScheduledFuture<?> scenarioClearFuture;

        SimulationSessionRuntime(SimulationSession session, List<WaypointVm> waypoints, String bearerToken) {
            this(session, waypoints, bearerToken, null, null, null);
        }

        SimulationSessionRuntime(
                SimulationSession session,
                List<WaypointVm> waypoints,
                String bearerToken,
                String departureHubId,
                String arrivalHubId,
                Double defaultCruiseAlt) {
            this.sessionId = session.getId();
            this.droneId = session.getDroneId();
            this.flightId = session.getFlightId();
            this.bearerToken = bearerToken;
            this.departureHubId = departureHubId;
            this.arrivalHubId = arrivalHubId;
            this.originalWaypoints = List.copyOf(waypoints);
            this.waypoints = new ArrayList<>(waypoints);
            this.originWaypoint = waypoints.getFirst();
            WaypointVm lastWp = waypoints.getLast();
            this.homePadWaypoint = new WaypointVm(originWaypoint.lat(), originWaypoint.lon(), 0.0);
            this.arrivalPadWaypoint = new WaypointVm(lastWp.lat(), lastWp.lon(), 0.0);
            this.defaultCruiseAlt = defaultCruiseAlt != null && defaultCruiseAlt > 0.0
                    ? defaultCruiseAlt
                    : (originWaypoint.alt() > 0.0 ? originWaypoint.alt() : 50.0);
            this.status = session.getStatus();
            this.cruiseSpeed = session.getSpeed() != null && session.getSpeed() > 0 ? session.getSpeed() : 15.0;
            this.speed = this.cruiseSpeed;
            this.timeScale = session.getTimeScale() != null ? session.getTimeScale() : 1.0;
            this.currentBattery = session.getCurrentBattery() != null ? session.getCurrentBattery() : 100.0;
            this.lastReportedBattery = this.currentBattery;
            this.activeScenario = session.getActiveScenario();

            this.segmentDistances = new ArrayList<>();
            rebuildSegments();

            WaypointVm first = waypoints.getFirst();
            this.currentLat = first.lat();
            this.currentLon = first.lon();
            this.currentAlt = first.alt();
            double initialHoriz = calculateHaversineDistance(first.lat(), first.lon(),
                    waypoints.get(1).lat(), waypoints.get(1).lon());
            this.currentHeading = first.headingAtWaypoint() != null
                    ? first.headingAtWaypoint()
                    : (initialHoriz > 0.1
                            ? calculateBearing(first.lat(), first.lon(), waypoints.get(1).lat(), waypoints.get(1).lon())
                            : 0.0);
        }

        RuntimeSnapshot snapshot() {
            return new RuntimeSnapshot(
                    sessionId,
                    droneId,
                    status,
                    speed,
                    timeScale,
                    currentLat,
                    currentLon,
                    currentAlt,
                    currentHeading,
                    currentBattery,
                    lastReportedBattery,
                    calculateProgress(),
                    cumulativeTraveled,
                    currentSegment,
                    activeScenario,
                    failsafeRerouteActive);
        }

        void cancelFutures(boolean mayInterruptIfRunning) {
            ScheduledFuture<?> tickFuture = this.scheduledFuture;
            if (tickFuture != null) {
                tickFuture.cancel(mayInterruptIfRunning);
            }
            ScheduledFuture<?> clearFuture = this.scenarioClearFuture;
            if (clearFuture != null) {
                clearFuture.cancel(false);
                this.scenarioClearFuture = null;
            }
        }

        void registerActiveCommand(String commandId, String cmdType) {
            if (!cmdType.equals(this.activeCommandType)) {
                this.activeCommandIds.clear();
                this.activeCommandType = cmdType;
            }
            if (commandId != null && !commandId.isBlank() && !this.activeCommandIds.contains(commandId)) {
                this.activeCommandIds.add(commandId);
            }
        }

        List<String> drainActiveCommandIdsExcept(String keepCommandId) {
            List<String> drained = new ArrayList<>();
            for (String id : activeCommandIds) {
                if (!id.equals(keepCommandId)) {
                    drained.add(id);
                }
            }
            activeCommandIds.clear();
            activeCommandType = null;
            return drained;
        }

        void drainActiveCommandsToAcks(List<PendingAck> out, String status, String message) {
            if (activeCommandIds.isEmpty()) {
                return;
            }
            String cmdType = this.activeCommandType;
            for (String cmdId : activeCommandIds) {
                out.add(new PendingAck(cmdId, droneId, flightId, cmdType, status, message));
            }
            activeCommandIds.clear();
            activeCommandType = null;
        }

        void rebuildSegments() {
            this.segmentDistances.clear();
            double total = 0.0;
            for (int i = 0; i < waypoints.size() - 1; i++) {
                double horiz = calculateHaversineDistance(
                        waypoints.get(i).lat(), waypoints.get(i).lon(),
                        waypoints.get(i + 1).lat(), waypoints.get(i + 1).lon());
                double vert = Math.abs(waypoints.get(i + 1).alt() - waypoints.get(i).alt());
                double d = Math.hypot(horiz, vert);
                segmentDistances.add(d);
                total += d;
            }
            this.totalDistance = Math.max(total, 0.001);
        }

        void rerouteTo(WaypointVm destination) {
            reroutePath(List.of(new WaypointVm(currentLat, currentLon, currentAlt), destination));
        }

        void reroutePath(List<WaypointVm> path) {
            this.waypoints.clear();
            this.waypoints.addAll(path);
            rebuildSegments();
            this.currentSegment = 0;
            this.distanceInSegment = 0.0;
            this.cumulativeTraveled = 0.0;
            for (int i = 0; i < waypoints.size() - 1; i++) {
                double horiz = calculateHaversineDistance(
                        waypoints.get(i).lat(), waypoints.get(i).lon(),
                        waypoints.get(i + 1).lat(), waypoints.get(i + 1).lon());
                if (horiz > 0.5) {
                    this.currentHeading = calculateBearing(
                            waypoints.get(i).lat(), waypoints.get(i).lon(),
                            waypoints.get(i + 1).lat(), waypoints.get(i + 1).lon());
                    break;
                }
            }
        }

        void rejoinOriginalRoute() {
            if (originalWaypoints == null || originalWaypoints.size() < 2) {
                return;
            }
            int bestIdx = originalWaypoints.size() - 1;
            double bestDist = Double.MAX_VALUE;
            for (int i = 1; i < originalWaypoints.size(); i++) {
                WaypointVm wp = originalWaypoints.get(i);
                double d = calculateHaversineDistance(currentLat, currentLon, wp.lat(), wp.lon());
                if (d < bestDist) {
                    bestDist = d;
                    bestIdx = i;
                }
            }
            if (bestDist < 20.0 && bestIdx + 1 < originalWaypoints.size()) {
                bestIdx++;
            }
            List<WaypointVm> rejoined = new ArrayList<>();
            rejoined.add(new WaypointVm(currentLat, currentLon, currentAlt));
            for (int i = bestIdx; i < originalWaypoints.size(); i++) {
                rejoined.add(originalWaypoints.get(i));
            }
            reroutePath(rejoined);
        }

        String resolveNearbyHubId(double thresholdMeters) {
            if (arrivalHubId != null && !arrivalHubId.isBlank()
                    && calculateHaversineDistance(currentLat, currentLon,
                            arrivalPadWaypoint.lat(), arrivalPadWaypoint.lon()) <= thresholdMeters) {
                return arrivalHubId;
            }
            if (departureHubId != null && !departureHubId.isBlank()
                    && calculateHaversineDistance(currentLat, currentLon,
                            homePadWaypoint.lat(), homePadWaypoint.lon()) <= thresholdMeters) {
                return departureHubId;
            }
            return null;
        }

        double targetSpeedForCurrentSegment() {
            if (currentSegment + 1 < waypoints.size()) {
                WaypointVm p1 = waypoints.get(currentSegment);
                WaypointVm target = waypoints.get(currentSegment + 1);
                if (target.speed() != null && target.speed() > 0.0) {
                    return target.speed();
                }
                double horiz = calculateHaversineDistance(p1.lat(), p1.lon(), target.lat(), target.lon());
                if (horiz <= 1.0) {
                    return target.alt() >= p1.alt() ? 4.0 : 3.5;
                }
            }
            return cruiseSpeed;
        }

        void advance(double stepDist) {
            boolean preserveAltitude = forcedDescentActive
                    || targetAltitudeOverride != null
                    || "motor_failure".equalsIgnoreCase(activeScenario)
                    || currentBattery <= 5.0;

            double remainingStep = stepDist;
            while (remainingStep > 0 && currentSegment < segmentDistances.size()) {
                double segLen = segmentDistances.get(currentSegment);
                double remInSeg = segLen - distanceInSegment;

                if (remainingStep < remInSeg) {
                    distanceInSegment += remainingStep;
                    cumulativeTraveled += remainingStep;
                    remainingStep = 0;
                } else {
                    cumulativeTraveled += remInSeg;
                    remainingStep -= remInSeg;
                    currentSegment++;
                    distanceInSegment = 0.0;
                    if (currentSegment < waypoints.size()) {
                        WaypointVm reached = waypoints.get(currentSegment);
                        if (reached.headingAtWaypoint() != null) {
                            currentHeading = reached.headingAtWaypoint();
                        }
                        if (reached.hoverDurationSec() != null && reached.hoverDurationSec() > 0) {
                            remainingHoverSeconds = reached.hoverDurationSec();
                            currentLat = reached.lat();
                            currentLon = reached.lon();
                            if (!preserveAltitude) {
                                currentAlt = reached.alt();
                            }
                            return;
                        }
                    }
                }
            }

            if (currentSegment >= segmentDistances.size()) {
                WaypointVm last = waypoints.getLast();
                currentLat = last.lat();
                currentLon = last.lon();
                if (!preserveAltitude) {
                    currentAlt = last.alt();
                }
                if (last.headingAtWaypoint() != null) {
                    currentHeading = last.headingAtWaypoint();
                }
                cumulativeTraveled = totalDistance;
            } else {
                WaypointVm p1 = waypoints.get(currentSegment);
                WaypointVm p2 = waypoints.get(currentSegment + 1);
                double segLen = Math.max(segmentDistances.get(currentSegment), 0.001);
                double fraction = Math.min(1.0, distanceInSegment / segLen);

                currentLat = p1.lat() + fraction * (p2.lat() - p1.lat());
                currentLon = p1.lon() + fraction * (p2.lon() - p1.lon());
                if (!preserveAltitude) {
                    currentAlt = p1.alt() + fraction * (p2.alt() - p1.alt());
                }
                double horiz = calculateHaversineDistance(p1.lat(), p1.lon(), p2.lat(), p2.lon());
                if (horiz > 0.1) {
                    currentHeading = calculateBearing(p1.lat(), p1.lon(), p2.lat(), p2.lon());
                }
            }
        }

        boolean isFinished() {
            return currentSegment >= segmentDistances.size();
        }

        double calculateProgress() {
            return Math.min(100.0, Math.round((cumulativeTraveled / totalDistance) * 1000.0) / 10.0);
        }
    }
}

package com.utm.simulation.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.simulation.service.client.FlightClientService;
import com.utm.simulation.service.client.TelemetryClientService;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;

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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

@Service
@RequiredArgsConstructor
@Slf4j
public class SimulationServiceImpl implements SimulationService {

    private static final double EARTH_RADIUS_METERS = 6371000.0;

    private final SimulationSessionRepository sessionRepository;
    private final SimulationEventRepository eventRepository;
    private final SimulationMapper simulationMapper;
    private final TelemetryClientService telemetryClientService;
    private final FlightClientService flightClientService;
    private final ObjectMapper objectMapper;

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
        if (flightId == null || flightId.isBlank()) {
            throw new BadRequestException(MessageCode.FLIGHT_NOT_FOUND, "id", "null");
        }

        FlightDetailVm flight = flightClientService.getFlightDetail(flightId.trim());
        if (flight == null) {
            throw new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, "id", flightId);
        }

        String droneId = flight.droneId();
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

        List<WaypointVm> waypoints = resolveWaypoints(flight);
        double totalDist = calculateTotalDistance(waypoints);
        if (totalDist < 10.0) {
            throw new BadRequestException(MessageCode.INVALID_SIMULATION_WAYPOINTS);
        }

        WaypointVm first = waypoints.getFirst();
        WaypointVm second = waypoints.get(1);
        double initialHeading = calculateBearing(first.lat(), first.lon(), second.lat(), second.lon());

        SimulationSession entity = simulationMapper.toEntity(createVm);
        entity.setDroneId(droneId);
        entity.setFlightId(flight.id() != null ? flight.id() : flightId);
        entity.setStatus(SimulationStatus.RUNNING);
        entity.setCurrentLat(first.lat());
        entity.setCurrentLon(first.lon());
        entity.setCurrentAlt(first.alt());
        entity.setCurrentHeading(initialHeading);
        entity.setTotalDistance(totalDist);

        SimulationSession saved = sessionRepository.saveAndFlush(entity);

        SimulationSessionRuntime runtime = new SimulationSessionRuntime(saved, waypoints);
        Runnable startRuntime = () -> {
            activeRuntimes.put(saved.getId(), runtime);
            runtime.scheduledFuture = scheduler.scheduleAtFixedRate(
                    () -> runSimulationTick(runtime),
                    0,
                    1000,
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

        SimulationSessionRuntime runtime = activeRuntimes.remove(id);
        if (runtime != null) {
            runtime.cancelFutures(true);
        }

        List<SimulationEvent> events = eventRepository.findBySessionIdOrderByCreatedOnAsc(id);
        if (!events.isEmpty()) {
            eventRepository.deleteAll(events);
        }

        sessionRepository.delete(session);
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
        String configJson = serializeConfig(injectVm.config());
        Long durationSeconds = extractDurationSeconds(injectVm.config());

        SimulationSessionRuntime runtime = activeRuntimes.get(id);
        if (runtime != null) {
            runtime.lock.lock();
            try {
                runtime.activeScenario = scenarioCode;
                if ("c2_lost".equalsIgnoreCase(scenarioCode)) {
                    runtime.speed = 0.0;
                }
                if (runtime.scenarioClearFuture != null) {
                    runtime.scenarioClearFuture.cancel(false);
                    runtime.scenarioClearFuture = null;
                }
                if (durationSeconds != null && durationSeconds > 0) {
                    runtime.scenarioClearFuture = scheduler.schedule(
                            () -> autoClearScenarioIfMatches(id, scenarioCode),
                            durationSeconds,
                            TimeUnit.SECONDS);
                }
            } finally {
                runtime.lock.unlock();
            }
        }

        session.setActiveScenario(scenarioCode);
        sessionRepository.save(session);

        String message = String.format("Injected emergency scenario '%s' (%s)", scenario.getDisplayName(),
                scenario.getDescription());
        SimulationEvent event = recordEvent(id, "SCENARIO_INJECTED", scenarioCode, message,
                scenario.getDefaultSeverity(), configJson);

        log.warn("Injected emergency scenario '{}' into session '{}' for drone '{}'", scenarioCode, id,
                session.getDroneId());

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
            runtime.scenarioClearFuture = null;
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

    private String serializeConfig(Map<String, Object> config) {
        if (config == null || config.isEmpty() || objectMapper == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(config);
        } catch (JsonProcessingException ex) {
            log.warn("Failed to serialize scenario config to JSON: {}", ex.getMessage());
            return null;
        }
    }

    private Long extractDurationSeconds(Map<String, Object> config) {
        if (config == null || config.isEmpty()) {
            return null;
        }
        Object raw = config.get("durationSeconds");
        if (raw == null) {
            raw = config.get("lossDurationSeconds");
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
            String terminalLog = null;

            runtime.lock.lock();
            try {
                if (runtime.status != SimulationStatus.RUNNING) {
                    return;
                }

                if (runtime.currentBattery <= 0.0) {
                    runtime.status = SimulationStatus.STOPPED;
                    runtime.cancelFutures(false);
                    activeRuntimes.remove(runtime.sessionId);
                    snapshotToPersist = runtime.snapshot();
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
                    boolean sendTelemetry = !"c2_lost".equalsIgnoreCase(runtime.activeScenario)
                            && runtime.currentBattery > 0.0;

                    if (sendTelemetry) {
                        runtime.lastReportedBattery = runtime.currentBattery;
                        double effectiveLat = runtime.currentLat;
                        double effectiveLon = runtime.currentLon;
                        double effectiveAlt = runtime.currentAlt;
                        double effectiveHeading = runtime.currentHeading;
                        double effectiveSpeed = runtime.speed;

                        double noiseDistMeters = ThreadLocalRandom.current().nextGaussian() * 0.5;
                        double noiseLat = (noiseDistMeters / EARTH_RADIUS_METERS) * (180.0 / Math.PI);
                        double noiseLon = (noiseDistMeters
                                / (EARTH_RADIUS_METERS * Math.cos(Math.toRadians(effectiveLat))))
                                * (180.0 / Math.PI);
                        double noiseAlt = ThreadLocalRandom.current().nextGaussian() * 0.3;
                        double noiseHeading = ThreadLocalRandom.current().nextGaussian() * 1.0;
                        double noiseSpeed = ThreadLocalRandom.current().nextGaussian() * 0.1;

                        effectiveLat += noiseLat;
                        effectiveLon += noiseLon;
                        effectiveAlt = Math.max(0.0, effectiveAlt + noiseAlt);
                        effectiveHeading = (effectiveHeading + noiseHeading + 360.0) % 360.0;
                        effectiveSpeed = Math.max(0.0, effectiveSpeed + noiseSpeed);

                        if ("gps_failure".equalsIgnoreCase(runtime.activeScenario)) {
                            effectiveLat += (ThreadLocalRandom.current().nextDouble() - 0.5) * 0.001;
                            effectiveLon += (ThreadLocalRandom.current().nextDouble() - 0.5) * 0.001;
                        } else if ("geofence_breach".equalsIgnoreCase(runtime.activeScenario)) {
                            double perpHeading = Math.toRadians((runtime.currentHeading + 90.0) % 360.0);
                            double driftDist = 75.0;
                            effectiveLat += (driftDist * Math.cos(perpHeading) / EARTH_RADIUS_METERS)
                                    * (180.0 / Math.PI);
                            effectiveLon += (driftDist * Math.sin(perpHeading)
                                    / (EARTH_RADIUS_METERS * Math.cos(Math.toRadians(runtime.currentLat))))
                                    * (180.0 / Math.PI);
                        }

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
                                Math.round(runtime.currentBattery * 10.0) / 10.0);
                    }

                    if (runtime.isFinished()) {
                        runtime.status = SimulationStatus.COMPLETED;
                        runtime.cancelFutures(false);
                        activeRuntimes.remove(runtime.sessionId);
                        snapshotToPersist = runtime.snapshot();
                        pendingEvent = new PendingEvent(
                                runtime.sessionId,
                                "SESSION_COMPLETED",
                                null,
                                "Flight simulation completed at final waypoint",
                                "LOW",
                                null);
                        terminalLog = "Simulation session '" + runtime.sessionId
                                + "' completed flight path successfully";
                    } else {
                        double timeStepSeconds = 1.0 * runtime.timeScale;
                        double stepDist = runtime.speed * timeStepSeconds;
                        boolean crashed = false;

                        if ("motor_failure".equalsIgnoreCase(runtime.activeScenario)) {
                            runtime.speed = Math.max(3.0, runtime.speed * 0.8);
                            runtime.currentAlt = Math.max(0.0, runtime.currentAlt - (8.0 * timeStepSeconds));
                            if (runtime.currentAlt <= 0.0) {
                                runtime.speed = 0.0;
                                runtime.status = SimulationStatus.STOPPED;
                                runtime.cancelFutures(false);
                                activeRuntimes.remove(runtime.sessionId);
                                snapshotToPersist = runtime.snapshot();
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
                            if ("c2_lost".equalsIgnoreCase(runtime.activeScenario)) {
                                runtime.speed = 0.0;
                                stepDist = 0.0;
                            } else if (!"motor_failure".equalsIgnoreCase(runtime.activeScenario)) {
                                if (runtime.currentBattery > 0.0 && runtime.speed < runtime.cruiseSpeed) {
                                    runtime.speed = runtime.cruiseSpeed;
                                    stepDist = runtime.speed * timeStepSeconds;
                                }
                            }

                            if ("battery_drain".equalsIgnoreCase(runtime.activeScenario)) {
                                runtime.currentBattery = Math.max(0.0, runtime.currentBattery - (5.0 * timeStepSeconds));
                            } else {
                                runtime.currentBattery = Math.max(0.0,
                                        runtime.currentBattery - (0.0333 * timeStepSeconds));
                            }
                            if (runtime.currentBattery <= 5.0) {
                                runtime.currentAlt = Math.max(0.0, runtime.currentAlt - (3.0 * timeStepSeconds));
                                if (runtime.currentAlt <= 0.0) {
                                    runtime.speed = 0.0;
                                }
                            }

                            if (runtime.currentBattery <= 0.0
                                    || (runtime.currentBattery <= 5.0 && runtime.currentAlt <= 0.0)) {
                                runtime.status = SimulationStatus.STOPPED;
                                runtime.cancelFutures(false);
                                activeRuntimes.remove(runtime.sessionId);
                                snapshotToPersist = runtime.snapshot();
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

            if (telemetryPush != null) {
                telemetryClientService.pushTelemetry(telemetryPush);
            }
            if (snapshotToPersist != null) {
                persistRuntimeState(snapshotToPersist);
            }
            if (pendingEvent != null) {
                recordEvent(
                        pendingEvent.sessionId(),
                        pendingEvent.eventType(),
                        pendingEvent.scenario(),
                        pendingEvent.message(),
                        pendingEvent.severity(),
                        pendingEvent.configJson());
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

    private void persistRuntimeState(RuntimeSnapshot snapshot) {
        try {
            sessionRepository.findById(snapshot.sessionId()).ifPresent(s -> {
                s.setStatus(snapshot.status());
                boolean isC2Lost = "c2_lost".equalsIgnoreCase(snapshot.activeScenario());
                s.setSpeed(isC2Lost ? 0.0 : snapshot.speed());
                s.setTimeScale(snapshot.timeScale());
                s.setCurrentLat(snapshot.currentLat());
                s.setCurrentLon(snapshot.currentLon());
                s.setCurrentAlt(snapshot.currentAlt());
                s.setCurrentHeading(snapshot.currentHeading());
                s.setCurrentBattery(isC2Lost ? snapshot.lastReportedBattery() : snapshot.currentBattery());
                s.setProgress(snapshot.progress());
                s.setTraveledDistance(snapshot.cumulativeTraveled());
                s.setCurrentSegment(snapshot.currentSegment());
                s.setActiveScenario(snapshot.activeScenario());
                sessionRepository.save(s);
            });
        } catch (Exception ex) {
            log.warn("Failed to persist simulation state for session '{}': {}", snapshot.sessionId(), ex.getMessage());
        }
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

        boolean isC2Lost = "c2_lost".equalsIgnoreCase(snapshot.activeScenario());
        SimulationSession detachedCopy = SimulationSession.builder()
                .id(session.getId())
                .flightId(session.getFlightId())
                .droneId(session.getDroneId())
                .status(snapshot.status())
                .timeScale(snapshot.timeScale())
                .speed(isC2Lost ? 0.0 : snapshot.speed())
                .currentLat(snapshot.currentLat())
                .currentLon(snapshot.currentLon())
                .currentAlt(snapshot.currentAlt())
                .currentHeading(snapshot.currentHeading())
                .currentBattery(isC2Lost ? snapshot.lastReportedBattery() : snapshot.currentBattery())
                .progress(snapshot.progress())
                .totalDistance(session.getTotalDistance())
                .traveledDistance(snapshot.cumulativeTraveled())
                .currentSegment(snapshot.currentSegment())
                .activeScenario(snapshot.activeScenario())
                .build();
        detachedCopy.setCreatedOn(session.getCreatedOn());
        detachedCopy.setCreatedBy(session.getCreatedBy());
        detachedCopy.setLastModifiedOn(session.getLastModifiedOn());
        detachedCopy.setLastModifiedBy(session.getLastModifiedBy());
        return detachedCopy;
    }

    private SimulationEvent recordEvent(String sessionId, String eventType, String scenario, String message,
            String severity, String configJson) {
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
                List<WaypointVm> extracted = new ArrayList<>();
                for (List<Double> coord : flight.plannedRoute().coordinates()) {
                    if (coord != null && coord.size() >= 2) {
                        double lon = coord.get(0);
                        double lat = coord.get(1);
                        double alt = coord.size() > 2 && coord.get(2) != null ? coord.get(2) : defaultAlt;
                        extracted.add(new WaypointVm(lat, lon, alt));
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
            String activeScenario) {
    }

    private record PendingEvent(
            String sessionId,
            String eventType,
            String scenario,
            String message,
            String severity,
            String configJson) {
    }

    private static class SimulationSessionRuntime {
        final ReentrantLock lock = new ReentrantLock();
        final String sessionId;
        final String droneId;
        final String flightId;
        final List<WaypointVm> waypoints;
        final double totalDistance;
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
        long tickCount = 0;
        volatile ScheduledFuture<?> scheduledFuture;
        volatile ScheduledFuture<?> scenarioClearFuture;

        SimulationSessionRuntime(SimulationSession session, List<WaypointVm> waypoints) {
            this.sessionId = session.getId();
            this.droneId = session.getDroneId();
            this.flightId = session.getFlightId();
            this.waypoints = new ArrayList<>(waypoints);
            this.status = session.getStatus();
            this.cruiseSpeed = session.getSpeed() != null && session.getSpeed() > 0 ? session.getSpeed() : 15.0;
            this.speed = this.cruiseSpeed;
            this.timeScale = session.getTimeScale() != null ? session.getTimeScale() : 1.0;
            this.currentBattery = session.getCurrentBattery() != null ? session.getCurrentBattery() : 100.0;
            this.lastReportedBattery = this.currentBattery;
            this.activeScenario = session.getActiveScenario();

            this.segmentDistances = new ArrayList<>();
            double total = 0.0;
            for (int i = 0; i < waypoints.size() - 1; i++) {
                double d = calculateHaversineDistance(
                        waypoints.get(i).lat(), waypoints.get(i).lon(),
                        waypoints.get(i + 1).lat(), waypoints.get(i + 1).lon());
                segmentDistances.add(d);
                total += d;
            }
            this.totalDistance = Math.max(total, 0.001);

            WaypointVm first = waypoints.getFirst();
            this.currentLat = first.lat();
            this.currentLon = first.lon();
            this.currentAlt = first.alt();
            this.currentHeading = calculateBearing(first.lat(), first.lon(), waypoints.get(1).lat(),
                    waypoints.get(1).lon());
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
                    activeScenario);
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

        void advance(double stepDist) {
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
                }
            }

            if (currentSegment >= segmentDistances.size()) {
                WaypointVm last = waypoints.getLast();
                currentLat = last.lat();
                currentLon = last.lon();
                currentAlt = last.alt();
                cumulativeTraveled = totalDistance;
            } else {
                WaypointVm p1 = waypoints.get(currentSegment);
                WaypointVm p2 = waypoints.get(currentSegment + 1);
                double segLen = Math.max(segmentDistances.get(currentSegment), 0.001);
                double fraction = Math.min(1.0, distanceInSegment / segLen);

                currentLat = p1.lat() + fraction * (p2.lat() - p1.lat());
                currentLon = p1.lon() + fraction * (p2.lon() - p1.lon());
                currentAlt = p1.alt() + fraction * (p2.alt() - p1.alt());
                currentHeading = calculateBearing(p1.lat(), p1.lon(), p2.lat(), p2.lon());
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

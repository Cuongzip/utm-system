package com.utm.simulation.service;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
import com.utm.simulation.viewmodel.FlightDetailVm;
import com.utm.simulation.viewmodel.InjectScenarioResultVm;
import com.utm.simulation.viewmodel.InjectScenarioVm;
import com.utm.simulation.viewmodel.ScenarioCatalogVm;
import com.utm.simulation.viewmodel.SimulationSessionCreateVm;
import com.utm.simulation.viewmodel.SimulationSessionVm;
import com.utm.simulation.viewmodel.TelemetryPushVm;
import com.utm.simulation.viewmodel.WaypointVm;

import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

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

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(8,
            Thread.ofVirtual().factory());
    private final Map<String, SimulationSessionRuntime> activeRuntimes = new ConcurrentHashMap<>();

    @Override
    @Transactional
    public SimulationSessionVm createSession(SimulationSessionCreateVm createVm, String bearerToken) {
        String flightId = createVm.flightId();
        if (flightId == null || flightId.isBlank()) {
            throw new BadRequestException(MessageCode.FLIGHT_NOT_FOUND, "null");
        }

        FlightDetailVm flight = flightClientService.getFlightDetail(flightId.trim(), bearerToken);
        if (flight == null) {
            throw new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, flightId);
        }

        String droneId = flight.droneId();
        if (droneId == null || droneId.isBlank()) {
            throw new BadRequestException(MessageCode.DRONE_NOT_FOUND, flightId);
        }

        boolean alreadyActive = sessionRepository
                .findByStatusIn(List.of(SimulationStatus.RUNNING, SimulationStatus.PAUSED)).stream()
                .anyMatch(s -> s.getDroneId().equals(droneId));
        if (alreadyActive) {
            throw new DuplicatedException(MessageCode.SIMULATION_ALREADY_ACTIVE, droneId);
        }

        List<WaypointVm> waypoints = resolveWaypoints(flight);
        double totalDist = calculateTotalDistance(waypoints);
        if (totalDist < 10.0) {
            throw new BadRequestException(MessageCode.INVALID_SIMULATION_WAYPOINTS);
        }

        String sessionId = UUID.randomUUID().toString();
        WaypointVm first = waypoints.getFirst();
        WaypointVm second = waypoints.get(1);
        double initialHeading = calculateBearing(first.lat(), first.lon(), second.lat(), second.lon());

        SimulationSession entity = SimulationSession.builder()
                .id(sessionId)
                .droneId(droneId)
                .missionId(flight.id() != null ? flight.id() : flightId)
                .departureHubId(flight.departureHubId() != null ? flight.departureHubId() : "hub-default")
                .arrivalHubId(flight.arrivalHubId())
                .status(SimulationStatus.RUNNING)
                .speed(createVm.speed())
                .timeScale(createVm.timeScale())
                .currentLat(first.lat())
                .currentLon(first.lon())
                .currentAlt(first.alt())
                .currentHeading(initialHeading)
                .currentBattery(createVm.startBattery())
                .progress(0.0)
                .totalDistance(totalDist)
                .traveledDistance(0.0)
                .currentSegment(0)
                .totalWaypoints(waypoints.size())
                .waypointsJson(simulationMapper.serializeWaypoints(waypoints))
                .build();

        SimulationSession saved = sessionRepository.saveAndFlush(entity);

        SimulationSessionRuntime runtime = new SimulationSessionRuntime(saved, waypoints, bearerToken);
        activeRuntimes.put(sessionId, runtime);

        ScheduledFuture<?> future = scheduler.scheduleAtFixedRate(
                () -> runSimulationTick(runtime),
                0,
                1000,
                TimeUnit.MILLISECONDS);
        runtime.scheduledFuture = future;

        log.info(
                "Initialized virtual flight simulation session '{}' for drone '{}' from flight '{}' at speed {} m/s (scale {}x)",
                sessionId, droneId, flightId, createVm.speed(), createVm.timeScale());

        return simulationMapper.toVm(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SimulationSessionVm> getAllSessions() {
        return sessionRepository.findAll().stream()
                .map(this::syncWithRuntime)
                .map(simulationMapper::toVm)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<SimulationSessionVm> getActiveSessions() {
        return sessionRepository.findByStatusIn(List.of(SimulationStatus.RUNNING, SimulationStatus.PAUSED)).stream()
                .map(this::syncWithRuntime)
                .map(simulationMapper::toVm)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public SimulationSessionVm getSessionById(String id) {
        SimulationSession session = sessionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.SIMULATION_NOT_FOUND, id));

        return simulationMapper.toVm(syncWithRuntime(session));
    }

    @Override
    @Transactional
    public void deleteSession(String id) {
        SimulationSession session = sessionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.SIMULATION_NOT_FOUND, id));

        SimulationSessionRuntime runtime = activeRuntimes.remove(id);
        if (runtime != null && runtime.scheduledFuture != null) {
            runtime.scheduledFuture.cancel(true);
        }

        sessionRepository.delete(session);
        log.info("Deleted simulation session '{}'", id);
    }

    @Override
    @Transactional
    public SimulationSessionVm pauseSession(String id) {
        SimulationSession session = sessionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.SIMULATION_NOT_FOUND, id));

        if (session.getStatus() == SimulationStatus.PAUSED) {
            throw new BadRequestException(MessageCode.INVALID_SIMULATION_STATE, "Simulation session is already paused");
        }
        if (session.getStatus() != SimulationStatus.RUNNING) {
            throw new BadRequestException(MessageCode.INVALID_SIMULATION_STATE,
                    "Cannot pause a " + session.getStatus().getValue()
                            + " simulation session. Only running sessions can be paused.");
        }

        SimulationSessionRuntime runtime = activeRuntimes.get(id);
        if (runtime != null) {
            synchronized (runtime) {
                runtime.status = SimulationStatus.PAUSED;
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
                .orElseThrow(() -> new NotFoundException(MessageCode.SIMULATION_NOT_FOUND, id));

        if (session.getStatus() == SimulationStatus.RUNNING) {
            throw new BadRequestException(MessageCode.INVALID_SIMULATION_STATE,
                    "Simulation session is already running");
        }
        if (session.getStatus() != SimulationStatus.PAUSED) {
            throw new BadRequestException(MessageCode.INVALID_SIMULATION_STATE,
                    "Cannot resume a " + session.getStatus().getValue()
                            + " simulation session. Only paused sessions can be resumed.");
        }

        SimulationSessionRuntime runtime = activeRuntimes.get(id);
        if (runtime == null) {
            throw new BadRequestException(MessageCode.INVALID_SIMULATION_STATE,
                    "No active in-memory runtime found for simulation session: " + id);
        }

        synchronized (runtime) {
            runtime.status = SimulationStatus.RUNNING;
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
                .orElseThrow(() -> new NotFoundException(MessageCode.SIMULATION_NOT_FOUND, id));

        if (session.getStatus() != SimulationStatus.RUNNING && session.getStatus() != SimulationStatus.PAUSED) {
            throw new BadRequestException(MessageCode.INVALID_SIMULATION_STATE,
                    "Cannot update time scale on a " + session.getStatus().getValue() + " simulation session");
        }

        SimulationSessionRuntime runtime = activeRuntimes.get(id);
        if (runtime != null) {
            synchronized (runtime) {
                runtime.timeScale = timeScale;
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
                .orElseThrow(() -> new NotFoundException(MessageCode.SIMULATION_NOT_FOUND, id));

        if (session.getStatus() != SimulationStatus.RUNNING && session.getStatus() != SimulationStatus.PAUSED) {
            throw new BadRequestException(MessageCode.INVALID_SIMULATION_STATE,
                    "Cannot inject scenario into a " + session.getStatus().getValue() + " simulation session");
        }

        EmergencyScenarioType scenario = injectVm.scenario();
        String scenarioCode = scenario.getValue();

        SimulationSessionRuntime runtime = activeRuntimes.get(id);
        if (runtime != null) {
            synchronized (runtime) {
                runtime.activeScenario = scenarioCode;
            }
        }

        session.setActiveScenario(scenarioCode);
        sessionRepository.save(session);

        String message = String.format("Injected emergency scenario '%s' (%s)", scenario.getDisplayName(),
                scenario.getDescription());
        SimulationEvent event = recordEvent(id, "SCENARIO_INJECTED", scenarioCode, message,
                scenario.getDefaultSeverity(), null);

        log.warn("Injected emergency scenario '{}' into session '{}' for drone '{}'", scenarioCode, id,
                session.getDroneId());

        return new InjectScenarioResultVm(true, simulationMapper.toVm(event));
    }

    @Override
    @Transactional
    public SimulationSessionVm stopSession(String id) {
        SimulationSession session = sessionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.SIMULATION_NOT_FOUND, id));

        if (session.getStatus() == SimulationStatus.STOPPED) {
            throw new BadRequestException(MessageCode.INVALID_SIMULATION_STATE,
                    "Simulation session is already stopped");
        }
        if (session.getStatus() == SimulationStatus.COMPLETED) {
            throw new BadRequestException(MessageCode.INVALID_SIMULATION_STATE,
                    "Cannot stop an already completed simulation session");
        }

        SimulationSessionRuntime runtime = activeRuntimes.remove(id);
        if (runtime != null && runtime.scheduledFuture != null) {
            runtime.scheduledFuture.cancel(true);
            runtime.status = SimulationStatus.STOPPED;
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

    private void runSimulationTick(SimulationSessionRuntime runtime) {
        try {
            synchronized (runtime) {
                if (runtime.status != SimulationStatus.RUNNING) {
                    return;
                }

                boolean sendTelemetry = !"c2_lost".equalsIgnoreCase(runtime.activeScenario);

                if (sendTelemetry) {
                    double effectiveLat = runtime.currentLat;
                    double effectiveLon = runtime.currentLon;

                    if ("gps_failure".equalsIgnoreCase(runtime.activeScenario)) {
                        effectiveLat += (Math.random() - 0.5) * 0.005;
                        effectiveLon += (Math.random() - 0.5) * 0.005;
                    }

                    TelemetryPushVm telemetryPush = new TelemetryPushVm(
                            runtime.droneId,
                            runtime.missionId,
                            Math.round(effectiveLat * 1e7) / 1e7,
                            Math.round(effectiveLon * 1e7) / 1e7,
                            Math.round(runtime.currentAlt * 10.0) / 10.0,
                            runtime.speed,
                            Math.round(runtime.currentHeading * 10.0) / 10.0,
                            0.0,
                            0.0,
                            runtime.currentHeading,
                            Math.round(runtime.currentBattery * 10.0) / 10.0);

                    telemetryClientService.pushTelemetry(telemetryPush, runtime.bearerToken);
                }

                if (runtime.isFinished()) {
                    runtime.status = SimulationStatus.COMPLETED;
                    if (runtime.scheduledFuture != null) {
                        runtime.scheduledFuture.cancel(false);
                    }
                    activeRuntimes.remove(runtime.sessionId);
                    persistRuntimeState(runtime);
                    recordEvent(runtime.sessionId, "SESSION_COMPLETED", null,
                            "Flight simulation completed at final waypoint", "LOW", null);
                    log.info("Simulation session '{}' completed flight path successfully", runtime.sessionId);
                    return;
                }

                double timeStepSeconds = 1.0 * runtime.timeScale;
                double stepDist = runtime.speed * timeStepSeconds;

                if ("motor_failure".equalsIgnoreCase(runtime.activeScenario)) {
                    runtime.speed = Math.max(3.0, runtime.speed * 0.8);
                    runtime.currentAlt = Math.max(0.0, runtime.currentAlt - (5.0 * timeStepSeconds));
                }

                if ("battery_drain".equalsIgnoreCase(runtime.activeScenario)) {
                    runtime.currentBattery = Math.max(0.0, runtime.currentBattery - (5.0 * timeStepSeconds));
                } else {
                    runtime.currentBattery = Math.max(0.0, runtime.currentBattery - (0.04 * timeStepSeconds));
                }

                runtime.advance(stepDist);

                runtime.tickCount++;
                if (runtime.tickCount % 5 == 0) {
                    persistRuntimeState(runtime);
                }
            }
        } catch (Exception ex) {
            log.error("Error in simulation tick for session '{}': {}", runtime.sessionId, ex.getMessage(), ex);
        }
    }

    private void persistRuntimeState(SimulationSessionRuntime runtime) {
        try {
            sessionRepository.findById(runtime.sessionId).ifPresent(s -> {
                s.setStatus(runtime.status);
                s.setSpeed(runtime.speed);
                s.setTimeScale(runtime.timeScale);
                s.setCurrentLat(runtime.currentLat);
                s.setCurrentLon(runtime.currentLon);
                s.setCurrentAlt(runtime.currentAlt);
                s.setCurrentHeading(runtime.currentHeading);
                s.setCurrentBattery(runtime.currentBattery);
                s.setProgress(runtime.calculateProgress());
                s.setTraveledDistance(runtime.cumulativeTraveled);
                s.setCurrentSegment(runtime.currentSegment);
                s.setActiveScenario(runtime.activeScenario);
                sessionRepository.save(s);
            });
        } catch (Exception ex) {
            log.warn("Failed to persist simulation state for session '{}': {}", runtime.sessionId, ex.getMessage());
        }
    }

    private SimulationSession syncWithRuntime(SimulationSession session) {
        SimulationSessionRuntime runtime = activeRuntimes.get(session.getId());
        if (runtime != null) {
            session.setStatus(runtime.status);
            session.setTimeScale(runtime.timeScale);
            session.setSpeed(runtime.speed);
            session.setCurrentLat(runtime.currentLat);
            session.setCurrentLon(runtime.currentLon);
            session.setCurrentAlt(runtime.currentAlt);
            session.setCurrentHeading(runtime.currentHeading);
            session.setCurrentBattery(runtime.currentBattery);
            session.setProgress(runtime.calculateProgress());
            session.setTraveledDistance(runtime.cumulativeTraveled);
            session.setCurrentSegment(runtime.currentSegment);
            session.setActiveScenario(runtime.activeScenario);
        }
        return session;
    }

    private SimulationEvent recordEvent(String sessionId, String eventType, String scenario, String message,
            String severity, String configJson) {
        SimulationEvent event = SimulationEvent.builder()
                .id(UUID.randomUUID().toString())
                .sessionId(sessionId)
                .eventType(eventType)
                .scenario(scenario)
                .message(message)
                .severity(severity != null ? severity : "LOW")
                .configJson(configJson)
                .createdOn(ZonedDateTime.now())
                .build();
        return eventRepository.save(event);
    }

    private List<WaypointVm> resolveWaypoints(FlightDetailVm flight) {
        if (flight != null && flight.waypoints() != null && flight.waypoints().size() >= 2) {
            log.info("Resolved {} trajectory waypoints from Flight Plan '{}'", flight.waypoints().size(), flight.id());
            return flight.waypoints();
        }

        return List.of(
                new WaypointVm(10.7769, 106.7009, 50.0),
                new WaypointVm(10.7820, 106.7050, 80.0),
                new WaypointVm(10.7890, 106.7120, 60.0));
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

    private static class SimulationSessionRuntime {
        final String sessionId;
        final String droneId;
        final String missionId;
        final List<WaypointVm> waypoints;
        final double totalDistance;
        final List<Double> segmentDistances;
        final String bearerToken;

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
        String activeScenario;
        long tickCount = 0;
        ScheduledFuture<?> scheduledFuture;

        SimulationSessionRuntime(SimulationSession session, List<WaypointVm> waypoints, String bearerToken) {
            this.sessionId = session.getId();
            this.droneId = session.getDroneId();
            this.missionId = session.getMissionId();
            this.waypoints = new ArrayList<>(waypoints);
            this.status = session.getStatus();
            this.speed = session.getSpeed();
            this.timeScale = session.getTimeScale();
            this.currentBattery = session.getCurrentBattery();
            this.activeScenario = session.getActiveScenario();
            this.bearerToken = bearerToken;

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

package com.utm.flight.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.commonlibrary.kafka.event.FlightLifecycleEvent;
import com.utm.flight.kafka.FlightEventPublisher;
import com.utm.flight.mapper.FlightConformanceMapper;
import com.utm.flight.model.Flight;
import com.utm.flight.model.FlightConformance;
import com.utm.flight.model.FlightWaypoint;
import com.utm.flight.model.GeoJsonLineString;
import com.utm.flight.model.enumeration.ConformanceStatus;
import com.utm.flight.model.enumeration.FlightStatus;
import com.utm.flight.repository.FlightConformanceRepository;
import com.utm.flight.repository.FlightRepository;
import com.utm.flight.service.client.ConflictClientService;
import com.utm.flight.service.client.DroneClientService;
import com.utm.flight.service.client.EmergencyClientService;
import com.utm.flight.service.client.TelemetryClientService;
import com.utm.flight.viewmodel.client.TelemetryBriefVm;
import com.utm.flight.viewmodel.flight.FlightConformanceVm;
import com.utm.flight.viewmodel.flight.GeoJsonLineStringVm;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Duration;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class FlightConformanceServiceImpl implements FlightConformanceService {

    private static final double EARTH_RADIUS_M = 6371000.0;
    private static final long TELEMETRY_TIMEOUT_NON_CONFORMING_SEC = 30L;
    private static final long TELEMETRY_TIMEOUT_CONTINGENT_SEC = 90L;
    private static final double WAYPOINT_REACHED_THRESHOLD_M = 35.0;

    private final FlightRepository flightRepository;
    private final FlightConformanceRepository conformanceRepository;
    private final TelemetryClientService telemetryClientService;
    private final ConflictClientService conflictClientService;
    private final EmergencyClientService emergencyClientService;
    private final FlightConformanceMapper conformanceMapper;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate transactionTemplate;
    private final FlightEventPublisher flightEventPublisher;
    private final DroneClientService droneClientService;

    private final Map<String, Set<String>> reportedEmergencyTypes = new ConcurrentHashMap<>();
    private final Map<String, Integer> lastReachedWaypointIndex = new ConcurrentHashMap<>();

    public FlightConformanceServiceImpl(
            FlightRepository flightRepository,
            FlightConformanceRepository conformanceRepository,
            TelemetryClientService telemetryClientService,
            ConflictClientService conflictClientService,
            EmergencyClientService emergencyClientService,
            FlightConformanceMapper conformanceMapper,
            ObjectMapper objectMapper,
            TransactionTemplate transactionTemplate,
            FlightEventPublisher flightEventPublisher) {
        this(flightRepository, conformanceRepository, telemetryClientService, conflictClientService,
                emergencyClientService, conformanceMapper, objectMapper, transactionTemplate,
                flightEventPublisher, null);
    }

    @Autowired
    public FlightConformanceServiceImpl(
            FlightRepository flightRepository,
            FlightConformanceRepository conformanceRepository,
            TelemetryClientService telemetryClientService,
            ConflictClientService conflictClientService,
            EmergencyClientService emergencyClientService,
            FlightConformanceMapper conformanceMapper,
            ObjectMapper objectMapper,
            TransactionTemplate transactionTemplate,
            @Autowired(required = false) FlightEventPublisher flightEventPublisher,
            @Autowired(required = false) DroneClientService droneClientService) {
        this.flightRepository = flightRepository;
        this.conformanceRepository = conformanceRepository;
        this.telemetryClientService = telemetryClientService;
        this.conflictClientService = conflictClientService;
        this.emergencyClientService = emergencyClientService;
        this.conformanceMapper = conformanceMapper;
        this.objectMapper = objectMapper;
        this.transactionTemplate = transactionTemplate;
        this.flightEventPublisher = flightEventPublisher;
        this.droneClientService = droneClientService;
    }

    @Override
    @Transactional(readOnly = true)
    public FlightConformanceVm getConformance(String flightId) {
        FlightConformance conformance = conformanceRepository.findByFlightId(flightId)
                .orElseGet(() -> {
                    Flight flight = flightRepository.findById(flightId)
                            .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, "id", flightId));
                    return conformanceMapper.toEntity(flight);
                });

        return conformanceMapper.toVm(conformance);
    }

    @Override
    public FlightConformanceVm evaluateFlightConformance(String flightId) {
        Flight flight = flightRepository.findById(flightId)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, "id", flightId));

        Optional<TelemetryBriefVm> telemetryOpt = telemetryClientService.getLatestFlightTelemetry(flight.getId());
        EvaluationOutcome outcome;
        if (transactionTemplate != null) {
            outcome = transactionTemplate.execute(status -> {
                Flight managed = flightRepository.findByIdForUpdate(flightId)
                        .or(() -> flightRepository.findById(flightId))
                        .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, "id", flightId));
                return evaluateAndPersist(managed, telemetryOpt);
            });
        } else {
            outcome = evaluateAndPersist(flight, telemetryOpt);
        }
        if (outcome == null) {
            throw new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, "id", flightId);
        }
        dispatchPostTxNotifications(outcome);
        return conformanceMapper.toVm(outcome.conformance());
    }

    @Override
    @Scheduled(fixedDelay = 5000)
    public void checkActiveFlightsConformance() {
        List<Flight> activeFlights = flightRepository.findByStatus(FlightStatus.ACTIVE);
        if (activeFlights.isEmpty()) {
            reportedEmergencyTypes.clear();
            lastReachedWaypointIndex.clear();
            return;
        }

        Set<String> activeIds = new HashSet<>();
        for (Flight active : activeFlights) {
            if (active.getId() != null) {
                activeIds.add(active.getId());
            }
        }
        reportedEmergencyTypes.keySet().retainAll(activeIds);
        lastReachedWaypointIndex.keySet().retainAll(activeIds);

        log.debug("Running 4D conformance watchdog for {} active flight(s)", activeFlights.size());
        for (Flight flight : activeFlights) {
            try {
                Optional<TelemetryBriefVm> telemetryOpt = telemetryClientService.getLatestFlightTelemetry(flight.getId());
                EvaluationOutcome outcome;
                if (transactionTemplate != null) {
                    outcome = transactionTemplate.execute(status -> flightRepository.findByIdForUpdate(flight.getId())
                            .or(() -> flightRepository.findById(flight.getId()))
                            .filter(managed -> managed.getStatus() == FlightStatus.ACTIVE)
                            .map(managed -> evaluateAndPersist(managed, telemetryOpt))
                            .orElse(null));
                } else {
                    outcome = evaluateAndPersist(flight, telemetryOpt);
                }
                if (outcome != null) {
                    dispatchPostTxNotifications(outcome);
                }
            } catch (Exception ex) {
                log.error("Failed to evaluate conformance for flight '{}': {}", flight.getId(), ex.getMessage(), ex);
            }
        }
    }

    private EvaluationOutcome evaluateAndPersist(Flight flight, Optional<TelemetryBriefVm> telemetryOpt) {
        FlightConformance conformance = conformanceRepository.findByFlightId(flight.getId())
                .orElseGet(() -> conformanceMapper.toEntity(flight));

        List<ConflictNotice> conflictNotices = new ArrayList<>();
        List<EmergencyNotice> emergencyNotices = new ArrayList<>();
        Integer reachedWaypointIdx = null;

        ZonedDateTime now = ZonedDateTime.now();
        conformance.setLastEvaluatedAt(now);

        if (telemetryOpt.isEmpty()) {
            handleMissingTelemetry(flight, conformance, now, conflictNotices, emergencyNotices);
            updateFlightStatusAndSave(flight, conformance);
            FlightConformance saved = conformanceRepository.save(conformance);
            return new EvaluationOutcome(flight, saved, conflictNotices, emergencyNotices, null);
        }

        TelemetryBriefVm telemetry = telemetryOpt.get();
        Double prevAlt = conformance.getCurrentAltitude();
        ZonedDateTime prevTime = conformance.getLastTelemetryTime();
        conformanceMapper.updateFromTelemetry(conformance, telemetry);

        long ageSeconds = Math.max(0, Duration.between(telemetry.getEffectiveTimestamp(), now).getSeconds());
        if (ageSeconds > TELEMETRY_TIMEOUT_CONTINGENT_SEC) {
            String msg = String.format("Telemetry lost for %d seconds (exceeded %ds emergency threshold)",
                    ageSeconds, TELEMETRY_TIMEOUT_CONTINGENT_SEC);
            transitionStatus(flight, conformance, ConformanceStatus.CONTINGENT, msg, telemetry, conflictNotices);
            if (markEmergencyReported(flight.getId(), "signal_lost")) {
                emergencyNotices.add(new EmergencyNotice(flight, "signal_lost", "critical", msg, telemetry,
                        Map.of("lostSeconds", ageSeconds)));
            }
            updateFlightStatusAndSave(flight, conformance);
            FlightConformance saved = conformanceRepository.save(conformance);
            return new EvaluationOutcome(flight, saved, conflictNotices, emergencyNotices, null);
        }

        if (ageSeconds > TELEMETRY_TIMEOUT_NON_CONFORMING_SEC) {
            transitionStatus(flight, conformance, ConformanceStatus.NON_CONFORMING,
                    String.format("Telemetry lost for %d seconds (exceeded %ds warning threshold)",
                            ageSeconds, TELEMETRY_TIMEOUT_NON_CONFORMING_SEC),
                    telemetry, conflictNotices);
            updateFlightStatusAndSave(flight, conformance);
            FlightConformance saved = conformanceRepository.save(conformance);
            return new EvaluationOutcome(flight, saved, conflictNotices, emergencyNotices, null);
        }

        if (prevAlt != null && prevTime != null && telemetry.altitude() != null) {
            long dtMs = Duration.between(prevTime, telemetry.getEffectiveTimestamp()).toMillis();
            if (dtMs >= 500 && dtMs <= 10000) {
                double dtSec = dtMs / 1000.0;
                double vz = (telemetry.altitude() - prevAlt) / dtSec;
                if (vz < -5.0) {
                    String msg = String.format(
                            "Rapid descent rate %.1f m/s detected! Suspected motor or propulsion failure", vz);
                    transitionStatus(flight, conformance, ConformanceStatus.CONTINGENT, msg, telemetry, conflictNotices);
                    if (markEmergencyReported(flight.getId(), "motor_failure")) {
                        emergencyNotices.add(new EmergencyNotice(flight, "motor_failure", "critical", msg, telemetry,
                                Map.of("descentRateMs", Math.round(vz * 10.0) / 10.0, "previousAltitude", prevAlt,
                                        "currentAltitude", telemetry.altitude())));
                    }
                    updateFlightStatusAndSave(flight, conformance);
                    FlightConformance saved = conformanceRepository.save(conformance);
                    return new EvaluationOutcome(flight, saved, conflictNotices, emergencyNotices, null);
                }
            }
        }

        Double battery = telemetry.batteryPercentage();
        if (battery != null) {
            if (battery <= 10.0) {
                String msg = String.format(
                        "Critical battery depletion: %.1f%%! Immediate failsafe landing or RTH required", battery);
                transitionStatus(flight, conformance, ConformanceStatus.CONTINGENT, msg, telemetry, conflictNotices);
                if (markEmergencyReported(flight.getId(), "battery_critical")) {
                    emergencyNotices.add(new EmergencyNotice(flight, "battery_critical", "critical", msg, telemetry,
                            Map.of("batteryPercentage", battery)));
                }
                updateFlightStatusAndSave(flight, conformance);
                FlightConformance saved = conformanceRepository.save(conformance);
                return new EvaluationOutcome(flight, saved, conflictNotices, emergencyNotices, null);
            } else if (battery <= 20.0
                    && (conformance.getStatus() == ConformanceStatus.CONFORMANT
                            || conformance.getStatus() == ConformanceStatus.UNKNOWN)) {
                String msg = String.format("Low battery level: %.1f%%. Return to base recommended", battery);
                transitionStatus(flight, conformance, ConformanceStatus.NON_CONFORMING, msg, telemetry, conflictNotices);
                if (markEmergencyReported(flight.getId(), "battery_low")) {
                    emergencyNotices.add(new EmergencyNotice(flight, "battery_low", "warning", msg, telemetry,
                            Map.of("batteryPercentage", battery)));
                }
            }
        }

        if (telemetry.latitude() == null || telemetry.longitude() == null || telemetry.altitude() == null) {
            updateFlightStatusAndSave(flight, conformance);
            FlightConformance saved = conformanceRepository.save(conformance);
            return new EvaluationOutcome(flight, saved, conflictNotices, emergencyNotices, null);
        }

        List<List<Double>> routeCoordinates = extractRouteCoordinates(flight.getPlannedRoute());
        Double cruisingAltitude = flight.getCruisingAltitudeM();

        ReachedWaypointInfo reachedInfo = detectReachedWaypoint(
                flight, telemetry.latitude(), telemetry.longitude(), routeCoordinates);
        reachedWaypointIdx = reachedInfo != null ? reachedInfo.waypointSequence() : null;
        boolean holdForConfirmation = reachedInfo != null && reachedInfo.waitForConfirmation();

        CrossTrackResult result = calculateCrossTrackError(
                telemetry.latitude(),
                telemetry.longitude(),
                telemetry.altitude(),
                routeCoordinates,
                cruisingAltitude);

        conformance.setCrossTrackErrorM(Math.round(result.crossTrackDistanceM() * 10.0) / 10.0);
        conformance.setVerticalErrorM(Math.round(result.verticalErrorM() * 10.0) / 10.0);

        List<String> violations = new ArrayList<>();
        boolean isLateralBreached = result.crossTrackDistanceM() > conformance.getCorridorRadiusM();
        boolean isVerticalBreached = result.verticalErrorM() > conformance.getAltitudeBufferM();

        if (isLateralBreached) {
            violations.add(String.format("Cross-track deviation %.1fm exceeds corridor radius %.1fm",
                    result.crossTrackDistanceM(), conformance.getCorridorRadiusM()));
        }
        if (isVerticalBreached) {
            violations.add(String.format("Vertical deviation %.1fm exceeds altitude buffer %.1fm",
                    result.verticalErrorM(), conformance.getAltitudeBufferM()));
        }

        conformance.setViolations(violations.isEmpty() ? null : new ArrayList<>(violations));

        if (result.crossTrackDistanceM() > 30.0 || (isLateralBreached && isVerticalBreached)) {
            transitionStatus(flight, conformance, ConformanceStatus.CONTINGENT,
                    String.join("; ", violations), telemetry, conflictNotices);
            if (result.crossTrackDistanceM() > 50.0 && markEmergencyReported(flight.getId(), "geofence_breach")) {
                emergencyNotices.add(new EmergencyNotice(flight, "geofence_breach", "critical",
                        "Severe 4D trajectory deviation: " + String.join("; ", violations), telemetry,
                        Map.of("crossTrackDistanceM", result.crossTrackDistanceM())));
            }
        } else if (isLateralBreached || isVerticalBreached) {
            transitionStatus(flight, conformance, ConformanceStatus.NON_CONFORMING,
                    String.join("; ", violations), telemetry, conflictNotices);
        } else if (battery == null || battery > 20.0) {
            transitionStatus(flight, conformance, ConformanceStatus.CONFORMANT,
                    "Drone on planned 4D corridor trajectory", telemetry, conflictNotices);
            reportedEmergencyTypes.remove(flight.getId());
        }

        updateFlightStatusAndSave(flight, conformance);
        FlightConformance saved = conformanceRepository.save(conformance);
        return new EvaluationOutcome(flight, saved, conflictNotices, emergencyNotices, reachedWaypointIdx, holdForConfirmation);
    }

    private void dispatchPostTxNotifications(EvaluationOutcome outcome) {
        for (ConflictNotice notice : outcome.conflictNotices()) {
            conflictClientService.reportConformanceConflict(
                    notice.flight(), notice.conformance(), notice.telemetry(), notice.message());
        }
        for (EmergencyNotice notice : outcome.emergencyNotices()) {
            emergencyClientService.reportIncident(
                    notice.flight(), notice.emergencyType(), notice.severity(), notice.message(),
                    notice.telemetry(), notice.detectionData());
        }
        if (outcome.reachedWaypointIndex() != null) {
            if (outcome.waitForConfirmation() && droneClientService != null && outcome.flight().getDroneId() != null) {
                droneClientService.sendDroneCommand(
                        outcome.flight().getDroneId(),
                        "HOVER",
                        outcome.flight().getId(),
                        String.format("{\"reason\":\"Waypoint #%d requires operator confirmation\",\"waypointIndex\":%d}",
                                outcome.reachedWaypointIndex(), outcome.reachedWaypointIndex()));
            }
            if (flightEventPublisher != null) {
                if (outcome.waitForConfirmation()) {
                    flightEventPublisher.publish(
                            FlightLifecycleEvent.FLIGHT_WAYPOINT_REACHED,
                            outcome.flight(),
                            null,
                            outcome.reachedWaypointIndex(),
                            "Reached waypoint #" + outcome.reachedWaypointIndex() + " (awaiting operator confirmation)",
                            true);
                } else {
                    flightEventPublisher.publish(
                            FlightLifecycleEvent.FLIGHT_WAYPOINT_REACHED,
                            outcome.flight(),
                            null,
                            outcome.reachedWaypointIndex(),
                            "Reached route waypoint #" + outcome.reachedWaypointIndex());
                }
            }
        }
    }

    private record ReachedWaypointInfo(int waypointSequence, boolean waitForConfirmation) {
    }

    private boolean markEmergencyReported(String flightId, String emergencyType) {
        if (flightId == null || emergencyType == null) {
            return true;
        }
        return reportedEmergencyTypes
                .computeIfAbsent(flightId, k -> ConcurrentHashMap.newKeySet())
                .add(emergencyType);
    }

    private ReachedWaypointInfo detectReachedWaypoint(
            Flight flight,
            double lat,
            double lon,
            List<List<Double>> routeCoordinates
    ) {
        String flightId = flight != null ? flight.getId() : null;
        if (flightId == null) {
            return null;
        }

        List<FlightWaypoint> structuredWaypoints = flight.getWaypoints();
        if (structuredWaypoints != null && !structuredWaypoints.isEmpty()) {
            int lastReached = lastReachedWaypointIndex.getOrDefault(flightId, -1);
            ReachedWaypointInfo newlyReached = null;
            for (int idx = lastReached + 1; idx < structuredWaypoints.size(); idx++) {
                FlightWaypoint wp = structuredWaypoints.get(idx);
                if (wp == null || wp.latitude() == null || wp.longitude() == null) {
                    continue;
                }
                double dist = calculateHaversineDistance(lat, lon, wp.latitude(), wp.longitude());
                if (dist <= WAYPOINT_REACHED_THRESHOLD_M) {
                    lastReachedWaypointIndex.put(flightId, idx);
                    int reportedSeq = wp.sequence() != null ? wp.sequence() : (idx + 1);
                    newlyReached = new ReachedWaypointInfo(reportedSeq, Boolean.TRUE.equals(wp.waitForConfirmation()));
                }
            }
            return newlyReached;
        }

        if (routeCoordinates == null || routeCoordinates.size() < 2) {
            return null;
        }
        int lastReached = lastReachedWaypointIndex.getOrDefault(flightId, -1);
        Integer newlyReached = null;
        for (int idx = lastReached + 1; idx < routeCoordinates.size(); idx++) {
            List<Double> coord = routeCoordinates.get(idx);
            if (coord == null || coord.size() < 2) {
                continue;
            }
            double dist = calculateHaversineDistance(lat, lon, coord.get(1), coord.get(0));
            if (dist <= WAYPOINT_REACHED_THRESHOLD_M) {
                lastReachedWaypointIndex.put(flightId, idx);
                newlyReached = idx;
            }
        }
        return newlyReached != null ? new ReachedWaypointInfo(newlyReached, false) : null;
    }

    private void updateFlightStatusAndSave(Flight flight, FlightConformance conformance) {
        if (flight.getConformanceStatus() != conformance.getStatus()) {
            flight.setConformanceStatus(conformance.getStatus());
            flightRepository.save(flight);
        }
    }

    private void transitionStatus(Flight flight, FlightConformance conformance,
            ConformanceStatus newStatus, String message,
            TelemetryBriefVm telemetry, List<ConflictNotice> conflictNotices) {
        ConformanceStatus prevStatus = conformance.getStatus();
        conformance.setStatus(newStatus);

        if (prevStatus != newStatus) {
            log.info("Flight '{}' conformance transitioned: {} -> {}. Message: {}",
                    flight.getId(), prevStatus, newStatus, message);

            if (newStatus == ConformanceStatus.NON_CONFORMING || newStatus == ConformanceStatus.CONTINGENT) {
                log.warn(
                        "{} breach detected for Flight '{}' (Flight Number: {}). Reporting conflict to conflict service.",
                        newStatus, flight.getId(), flight.getFlightNumber());
                conflictNotices.add(new ConflictNotice(flight, conformance, telemetry, message));
            }
        }
    }

    private void handleMissingTelemetry(Flight flight, FlightConformance conformance, ZonedDateTime now,
            List<ConflictNotice> conflictNotices, List<EmergencyNotice> emergencyNotices) {
        if (flight.getStatus() == FlightStatus.ACTIVE) {
            ZonedDateTime referenceTime = conformance.getLastTelemetryTime() != null
                    ? conformance.getLastTelemetryTime()
                    : (flight.getActualDeparture() != null ? flight.getActualDeparture() : now);

            long missingSec = Math.max(0, Duration.between(referenceTime, now).getSeconds());

            if (missingSec > TELEMETRY_TIMEOUT_CONTINGENT_SEC) {
                String msg = String.format("Telemetry stream absent for %d seconds (exceeded %ds emergency threshold)",
                        missingSec, TELEMETRY_TIMEOUT_CONTINGENT_SEC);
                transitionStatus(flight, conformance, ConformanceStatus.CONTINGENT, msg, null, conflictNotices);
                if (markEmergencyReported(flight.getId(), "signal_lost")) {
                    emergencyNotices.add(new EmergencyNotice(flight, "signal_lost", "critical", msg, null,
                            Map.of("lostSeconds", missingSec)));
                }
            } else if (missingSec > TELEMETRY_TIMEOUT_NON_CONFORMING_SEC) {
                transitionStatus(flight, conformance, ConformanceStatus.NON_CONFORMING,
                        "Telemetry lost for " + missingSec + " seconds", null, conflictNotices);
            }
        }
    }

    private List<List<Double>> extractRouteCoordinates(GeoJsonLineString plannedRoute) {
        if (plannedRoute == null || plannedRoute.coordinates() == null) {
            return List.of();
        }
        return plannedRoute.coordinates();
    }

    private static double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double rLat1 = Math.toRadians(lat1);
        double rLat2 = Math.toRadians(lat2);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_M * c;
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

    private static CrossTrackResult calculateCrossTrackError(
            double pLat, double pLon, double pAlt,
            List<List<Double>> coordinates, Double cruisingAltitude) {
        if (coordinates == null || coordinates.isEmpty()) {
            return new CrossTrackResult(0.0, 0.0);
        }

        if (coordinates.size() == 1) {
            List<Double> c = coordinates.getFirst();
            double wLon = c.get(0);
            double wLat = c.get(1);
            double wAlt = c.size() >= 3 ? c.get(2) : (cruisingAltitude != null ? cruisingAltitude : 50.0);
            double dist = calculateHaversineDistance(wLat, wLon, pLat, pLon);
            double vError = Math.abs(pAlt - wAlt);
            return new CrossTrackResult(dist, vError);
        }

        double minDistance = Double.MAX_VALUE;
        double correspondingVerticalError = 0.0;

        for (int i = 0; i < coordinates.size() - 1; i++) {
            List<Double> c1 = coordinates.get(i);
            List<Double> c2 = coordinates.get(i + 1);

            double w1Lon = c1.get(0);
            double w1Lat = c1.get(1);
            double w1Alt = c1.size() >= 3 ? c1.get(2) : (cruisingAltitude != null ? cruisingAltitude : 50.0);

            double w2Lon = c2.get(0);
            double w2Lat = c2.get(1);
            double w2Alt = c2.size() >= 3 ? c2.get(2) : (cruisingAltitude != null ? cruisingAltitude : 50.0);

            double d12 = calculateHaversineDistance(w1Lat, w1Lon, w2Lat, w2Lon);
            double d13 = calculateHaversineDistance(w1Lat, w1Lon, pLat, pLon);

            double brg12 = calculateBearing(w1Lat, w1Lon, w2Lat, w2Lon);
            double brg13 = calculateBearing(w1Lat, w1Lon, pLat, pLon);

            double delta13 = d13 / EARTH_RADIUS_M;
            double theta13 = Math.toRadians(brg13);
            double theta12 = Math.toRadians(brg12);

            double sinDxt = Math.sin(delta13) * Math.sin(theta13 - theta12);
            sinDxt = Math.max(-1.0, Math.min(1.0, sinDxt));
            double dxt = Math.abs(Math.asin(sinDxt)) * EARTH_RADIUS_M;

            double cosDxt = Math.cos(dxt / EARTH_RADIUS_M);
            double cosDat = (cosDxt != 0) ? Math.cos(delta13) / cosDxt : 0;
            cosDat = Math.max(-1.0, Math.min(1.0, cosDat));
            double dat = Math.acos(cosDat) * EARTH_RADIUS_M;

            double distanceToSegment;
            double fractionOnSegment;
            boolean isBehindStart = Math.cos(theta13 - theta12) < 0.0;
            if (isBehindStart) {
                distanceToSegment = d13;
                fractionOnSegment = 0.0;
            } else if (dat > d12) {
                distanceToSegment = calculateHaversineDistance(w2Lat, w2Lon, pLat, pLon);
                fractionOnSegment = 1.0;
            } else {
                distanceToSegment = dxt;
                fractionOnSegment = (d12 > 0) ? dat / d12 : 0.0;
            }

            if (distanceToSegment < minDistance) {
                minDistance = distanceToSegment;
                double expectedAlt = w1Alt + fractionOnSegment * (w2Alt - w1Alt);
                correspondingVerticalError = Math.abs(pAlt - expectedAlt);
            }
        }

        return new CrossTrackResult(minDistance, correspondingVerticalError);
    }

    record CrossTrackResult(double crossTrackDistanceM, double verticalErrorM) {
    }

    private record ConflictNotice(Flight flight, FlightConformance conformance, TelemetryBriefVm telemetry,
            String message) {
    }

    private record EmergencyNotice(Flight flight, String emergencyType, String severity, String message,
            TelemetryBriefVm telemetry, Map<String, Object> detectionData) {
    }

    private record EvaluationOutcome(Flight flight, FlightConformance conformance,
            List<ConflictNotice> conflictNotices, List<EmergencyNotice> emergencyNotices,
            Integer reachedWaypointIndex, boolean waitForConfirmation) {
        EvaluationOutcome(Flight flight, FlightConformance conformance,
                List<ConflictNotice> conflictNotices, List<EmergencyNotice> emergencyNotices,
                Integer reachedWaypointIndex) {
            this(flight, conformance, conflictNotices, emergencyNotices, reachedWaypointIndex, false);
        }
    }
}

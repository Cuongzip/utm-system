package com.utm.conflict.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.utm.conflict.config.ServiceUrlConfig;
import com.utm.conflict.mapper.ConflictDetectionMapper;
import com.utm.conflict.model.Conflict;
import com.utm.conflict.model.enumeration.ConflictSeverity;
import com.utm.conflict.model.enumeration.ConflictStatus;
import com.utm.conflict.model.enumeration.ConflictType;
import com.utm.conflict.repository.ConflictRepository;
import com.utm.conflict.viewmodel.client.AirspaceCheckPostVm;
import com.utm.conflict.viewmodel.client.AirspaceCheckResponseVm;
import com.utm.conflict.viewmodel.client.AlertTriggerPostVm;
import com.utm.conflict.viewmodel.client.EmergencyReportPostVm;
import com.utm.conflict.viewmodel.client.FlightBriefVm;
import com.utm.conflict.viewmodel.client.FlightListBriefVm;
import com.utm.conflict.viewmodel.client.TelemetryBriefVm;
import com.utm.conflict.viewmodel.conflict.ConflictScanResultVm;
import com.utm.conflict.viewmodel.conflict.StrategicTrajectoryCheckPostVm;
import com.utm.conflict.viewmodel.conflict.StrategicTrajectoryCheckResultVm;
import com.utm.conflict.viewmodel.conflict.StrategicTrajectoryPointVm;
import com.utm.conflict.viewmodel.conflict.TrajectoryConflictDetailVm;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

@Service
@Slf4j
public class ConflictDetectionServiceImpl implements ConflictDetectionService {

    private static final double EARTH_RADIUS_M = 6_371_000.0;
    private static final int MAX_CACHED_TELEMETRY_FLIGHTS = 500;
    private static final long TELEMETRY_CACHE_TTL_SECONDS = 30L;
    private static final long ACTIVE_FLIGHTS_CACHE_TTL_MS = 3_000L;
    private static final long STRATEGIC_SAMPLE_STEP_SEC = 5L;
    private static final int MAX_STRATEGIC_SAMPLES = 2_000;
    private static final Set<String> TERMINAL_FLIGHT_STATUSES = Set.of(
            "completed", "cancelled", "aborted", "rejected");
    private static final List<ConflictStatus> ACTIVE_STATUSES = List.of(
            ConflictStatus.DETECTED,
            ConflictStatus.NOTIFIED,
            ConflictStatus.ACKNOWLEDGED,
            ConflictStatus.RESOLVING);

    private final ConflictRepository conflictRepository;
    private final ConflictSnapshotService conflictSnapshotService;
    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;
    private final ConflictDetectionMapper conflictDetectionMapper;
    private final TransactionTemplate transactionTemplate;
    private final Map<String, CachedTelemetry> latestTelemetryCache = new ConcurrentHashMap<>();
    private final AtomicReference<CachedActiveFlights> activeFlightsCache = new AtomicReference<>();

    @Value("${utm.conflict.threshold.horizontal-m:150.0}")
    private double horizontalThresholdM = 150.0;

    @Value("${utm.conflict.threshold.vertical-m:30.0}")
    private double verticalThresholdM = 30.0;

    @Value("${utm.conflict.threshold.critical-horizontal-m:50.0}")
    private double criticalHorizontalM = 50.0;

    @Value("${utm.conflict.threshold.critical-vertical-m:15.0}")
    private double criticalVerticalM = 15.0;

    @Autowired
    public ConflictDetectionServiceImpl(
            ConflictRepository conflictRepository,
            ConflictSnapshotService conflictSnapshotService,
            RestClient restClient,
            ServiceUrlConfig serviceUrlConfig,
            ConflictDetectionMapper conflictDetectionMapper,
            @Autowired(required = false) TransactionTemplate transactionTemplate) {
        this.conflictRepository = conflictRepository;
        this.conflictSnapshotService = conflictSnapshotService;
        this.restClient = restClient;
        this.serviceUrlConfig = serviceUrlConfig;
        this.conflictDetectionMapper = conflictDetectionMapper;
        this.transactionTemplate = transactionTemplate;
    }

    @Override
    public void evaluateLiveTelemetry(TelemetryBriefVm incomingTelemetry) {
        if (incomingTelemetry == null || incomingTelemetry.latitude() == null
                || incomingTelemetry.longitude() == null || incomingTelemetry.altitude() == null
                || incomingTelemetry.flightId() == null) {
            return;
        }

        cacheLatestTelemetry(incomingTelemetry.flightId(), incomingTelemetry);

        AirspaceCheckResponseVm airspaceCheck = checkAirspaceCompliance(incomingTelemetry);
        if (airspaceCheck != null && !airspaceCheck.safe()) {
            String breachedZoneId = extractFirstZoneId(airspaceCheck);
            String createdConflictId = runInTransactionResult(() -> {
                List<Conflict> existingAirspaceConflicts = conflictRepository
                        .findByPrimaryFlightIdAndStatusIn(incomingTelemetry.flightId(), ACTIVE_STATUSES)
                        .stream()
                        .filter(c -> c.getSecondaryFlightId() == null)
                        .filter(c -> c.getConflictType() == ConflictType.AIRSPACE_BREACH)
                        .filter(c -> breachedZoneId == null || c.getAirspaceZoneId() == null
                                || breachedZoneId.equals(c.getAirspaceZoneId()))
                        .toList();

                if (existingAirspaceConflicts.isEmpty()) {
                    Conflict singleConflict = conflictDetectionMapper.toLiveSingleFlightConflict(
                            incomingTelemetry.flightId(),
                            ConflictType.AIRSPACE_BREACH,
                            ConflictSeverity.CRITICAL,
                            incomingTelemetry.latitude(),
                            incomingTelemetry.longitude(),
                            incomingTelemetry.altitude(),
                            String.format("Airspace breach detected for flight %s into restricted zone",
                                    incomingTelemetry.flightId()));
                    singleConflict.setAirspaceZoneId(breachedZoneId);
                    singleConflict = conflictRepository.save(singleConflict);

                    conflictSnapshotService.recordSnapshot(
                            singleConflict,
                            incomingTelemetry.latitude(), incomingTelemetry.longitude(), incomingTelemetry.altitude(),
                            null, null, null,
                            0.0, 0.0, 0, ConflictSeverity.CRITICAL);
                    return singleConflict.getId();
                }
                return null;
            });

            if (createdConflictId != null) {
                triggerAlert(
                        incomingTelemetry.droneId(),
                        incomingTelemetry.flightId(),
                        createdConflictId,
                        "AIRSPACE_BREACH",
                        "CRITICAL",
                        "Flight breached restricted airspace zone",
                        incomingTelemetry.altitude(),
                        120.0);
                log.warn("LIVE CONFLICT DETECTED: Airspace breach for flight {}", incomingTelemetry.flightId());
            }
        } else if (airspaceCheck != null && airspaceCheck.safe()) {
            List<String> resolvedIds = runInTransactionResult(() -> {
                List<Conflict> openBreaches = conflictRepository
                        .findByPrimaryFlightIdAndStatusIn(incomingTelemetry.flightId(), ACTIVE_STATUSES)
                        .stream()
                        .filter(c -> c.getSecondaryFlightId() == null
                                && c.getConflictType() == ConflictType.AIRSPACE_BREACH)
                        .toList();
                List<String> ids = new ArrayList<>();
                for (Conflict open : openBreaches) {
                    conflictDetectionMapper.resolveConflictAuto(open, "SYSTEM_AUTO");
                    conflictRepository.save(open);
                    ids.add(open.getId());
                }
                return ids;
            });
            if (resolvedIds != null) {
                for (String resolvedId : resolvedIds) {
                    autoResolveLinkedAlerts(resolvedId, "Flight exited restricted airspace zone");
                    log.info("LIVE AIRSPACE BREACH AUTO-RESOLVED: Conflict {} cleared restricted zone", resolvedId);
                }
            }
        }

        List<FlightBriefVm> activeFlights = fetchActiveFlightsCached();
        for (FlightBriefVm otherFlight : activeFlights) {
            if (otherFlight.id().equals(incomingTelemetry.flightId())) {
                continue;
            }
            TelemetryBriefVm otherTelemetry = getCachedOrFetchLatestTelemetry(otherFlight.id());
            if (otherTelemetry == null || otherTelemetry.latitude() == null
                    || otherTelemetry.longitude() == null || otherTelemetry.altitude() == null) {
                continue;
            }

            double distHoriz = calculateHaversineDistance(
                    incomingTelemetry.latitude(), incomingTelemetry.longitude(),
                    otherTelemetry.latitude(), otherTelemetry.longitude());
            double distVert = Math.abs(incomingTelemetry.altitude() - otherTelemetry.altitude());
            CpaResult cpa = calculateCpa(incomingTelemetry, otherTelemetry);

            boolean isSeparationLoss = (distHoriz < horizontalThresholdM) && (distVert < verticalThresholdM);
            boolean isPredictedLoss = (cpa.tcpa() > 0.0 && cpa.tcpa() < 120.0)
                    && (cpa.dcpa() < horizontalThresholdM)
                    && (cpa.projectedVertDist() < verticalThresholdM)
                    && (distHoriz < 250.0);

            if (isSeparationLoss || isPredictedLoss) {
                ConflictSeverity severity = determineSeverity(distHoriz, distVert);
                ConflictType conflictType = determineConflictType(incomingTelemetry.heading(),
                        otherTelemetry.heading());
                double midLat = (incomingTelemetry.latitude() + otherTelemetry.latitude()) / 2.0;
                double midLon = (incomingTelemetry.longitude() + otherTelemetry.longitude()) / 2.0;
                double midAlt = (incomingTelemetry.altitude() + otherTelemetry.altitude()) / 2.0;
                int timeToConflict = Math.max(0, (int) Math.round(cpa.tcpa()));

                String createdConflictId = runInTransactionResult(() -> {
                    List<Conflict> activeConflicts = conflictRepository.findActiveBetweenFlights(
                            incomingTelemetry.flightId(), otherFlight.id(), ACTIVE_STATUSES);

                    if (!activeConflicts.isEmpty()) {
                        for (Conflict existing : activeConflicts) {
                            conflictDetectionMapper.updateSeparation(
                                    existing, midLat, midLon, midAlt, distHoriz, distVert, timeToConflict, severity);
                            conflictRepository.save(existing);
                            recordOrderedSnapshot(
                                    existing,
                                    incomingTelemetry.flightId(), incomingTelemetry,
                                    otherFlight.id(), otherTelemetry,
                                    distHoriz, distVert, timeToConflict, severity);
                        }
                        return null;
                    }

                    Conflict newConflict = conflictDetectionMapper.toLiveEntity(
                            incomingTelemetry.flightId(),
                            otherFlight,
                            conflictType,
                            severity,
                            otherFlight.departureHubId(),
                            midLat,
                            midLon,
                            midAlt,
                            distHoriz,
                            distVert,
                            timeToConflict);
                    newConflict = conflictRepository.save(newConflict);
                    recordOrderedSnapshot(
                            newConflict,
                            incomingTelemetry.flightId(), incomingTelemetry,
                            otherFlight.id(), otherTelemetry,
                            distHoriz, distVert, timeToConflict, severity);
                    return newConflict.getId();
                });

                if (createdConflictId != null) {
                    if (severity == ConflictSeverity.CRITICAL || severity == ConflictSeverity.HIGH
                            || severity == ConflictSeverity.EMERGENCY) {
                        triggerAlert(
                                incomingTelemetry.droneId(),
                                incomingTelemetry.flightId(),
                                createdConflictId,
                                "CONFLICT_PROXIMITY",
                                toAlertSeverity(severity),
                                String.format("Loss of separation with flight %s (%.1fm)",
                                        otherFlight.flightNumber(), distHoriz),
                                distHoriz,
                                horizontalThresholdM);
                    }
                    if (severity == ConflictSeverity.CRITICAL) {
                        triggerEmergencyCollision(
                                incomingTelemetry.droneId(),
                                incomingTelemetry.flightId(),
                                otherFlight.flightNumber(),
                                midLat,
                                midLon,
                                midAlt,
                                distHoriz,
                                distVert);
                    }
                    log.warn("LIVE CONFLICT DETECTED: [{} - {}] Between Flight {} and Flight {} - Dist: {}m, Vert: {}m",
                            conflictType.getValue(), severity.getValue(),
                            incomingTelemetry.flightId(), otherFlight.flightNumber(),
                            Math.round(distHoriz), Math.round(distVert));
                }
            } else if (distHoriz > (horizontalThresholdM + 50.0) || distVert > (verticalThresholdM + 10.0)) {
                List<String> resolvedIds = runInTransactionResult(() -> {
                    List<Conflict> activeConflicts = conflictRepository.findActiveBetweenFlights(
                            incomingTelemetry.flightId(), otherFlight.id(), ACTIVE_STATUSES);
                    List<String> ids = new ArrayList<>();
                    for (Conflict existing : activeConflicts) {
                        conflictDetectionMapper.resolveConflictAuto(existing, "SYSTEM_AUTO");
                        conflictRepository.save(existing);
                        ids.add(existing.getId());
                        log.info("LIVE CONFLICT AUTO-RESOLVED: Conflict {} cleared buffer", existing.getId());
                    }
                    return ids;
                });
                if (resolvedIds != null) {
                    for (String resolvedId : resolvedIds) {
                        autoResolveLinkedAlerts(resolvedId, "Flights cleared safe separation buffer");
                    }
                }
            }
        }
    }

    @Override
    @Transactional
    public ConflictScanResultVm runConflictScan() {
        List<FlightBriefVm> activeFlights = fetchActiveFlights();
        if (activeFlights.isEmpty()) {
            latestTelemetryCache.clear();
            return conflictDetectionMapper.toScanResultVm(0, 0, 0, 0, 0, ZonedDateTime.now());
        }

        Set<String> activeFlightIds = new HashSet<>();
        List<FlightWithTelemetry> flightDataList = new ArrayList<>();
        for (FlightBriefVm flight : activeFlights) {
            activeFlightIds.add(flight.id());
            TelemetryBriefVm telemetry = fetchLatestTelemetry(flight.id());
            if (telemetry != null && telemetry.latitude() != null && telemetry.longitude() != null
                    && telemetry.altitude() != null) {
                cacheLatestTelemetry(flight.id(), telemetry);
                flightDataList.add(new FlightWithTelemetry(flight, telemetry));
            }
        }
        latestTelemetryCache.keySet().retainAll(activeFlightIds);

        int evaluatedPairs = 0;
        int newConflictsDetected = 0;
        int existingConflictsUpdated = 0;
        int resolvedConflictsCount = 0;

        for (FlightWithTelemetry ft : flightDataList) {
            AirspaceCheckResponseVm airspaceCheck = checkAirspaceCompliance(ft.telemetry());
            if (airspaceCheck != null && !airspaceCheck.safe()) {
                String breachedZoneId = extractFirstZoneId(airspaceCheck);
                List<Conflict> existingSingleConflicts = conflictRepository
                        .findByPrimaryFlightIdAndStatusIn(ft.flight().id(), ACTIVE_STATUSES)
                        .stream()
                        .filter(c -> c.getSecondaryFlightId() == null)
                        .filter(c -> c.getConflictType() == ConflictType.AIRSPACE_BREACH)
                        .filter(c -> breachedZoneId == null || c.getAirspaceZoneId() == null
                                || breachedZoneId.equals(c.getAirspaceZoneId()))
                        .toList();

                if (existingSingleConflicts.isEmpty()) {
                    Conflict singleConflict = conflictDetectionMapper.toSingleFlightConflict(
                            ft.flight(),
                            ConflictType.AIRSPACE_BREACH,
                            ConflictSeverity.CRITICAL,
                            ft.telemetry().latitude(),
                            ft.telemetry().longitude(),
                            ft.telemetry().altitude(),
                            String.format("Airspace breach detected for flight %s into restricted zone",
                                    ft.flight().flightNumber()));
                    singleConflict.setAirspaceZoneId(breachedZoneId);
                    singleConflict = conflictRepository.save(singleConflict);

                    conflictSnapshotService.recordSnapshot(
                            singleConflict,
                            ft.telemetry().latitude(), ft.telemetry().longitude(), ft.telemetry().altitude(),
                            null, null, null,
                            0.0, 0.0, 0, ConflictSeverity.CRITICAL);
                    newConflictsDetected++;

                    triggerAlert(
                            ft.flight().droneId(),
                            ft.flight().id(),
                            singleConflict.getId(),
                            "AIRSPACE_BREACH",
                            "CRITICAL",
                            "Flight breached restricted airspace zone",
                            ft.telemetry().altitude(),
                            120.0);
                    log.warn("SINGLE-FLIGHT CONFLICT DETECTED: Flight {} ({}) breached airspace zone",
                            ft.flight().flightNumber(), ft.flight().id());
                }
            } else if (airspaceCheck != null && airspaceCheck.safe()) {
                List<Conflict> openBreaches = conflictRepository
                        .findByPrimaryFlightIdAndStatusIn(ft.flight().id(), ACTIVE_STATUSES)
                        .stream()
                        .filter(c -> c.getSecondaryFlightId() == null
                                && c.getConflictType() == ConflictType.AIRSPACE_BREACH)
                        .toList();
                for (Conflict open : openBreaches) {
                    conflictDetectionMapper.resolveConflictAuto(open, "SYSTEM_AUTO");
                    conflictRepository.save(open);
                    resolvedConflictsCount++;
                    autoResolveLinkedAlerts(open.getId(), "Flight exited restricted airspace zone");
                }
            }
        }

        if (flightDataList.size() >= 2) {
            for (int i = 0; i < flightDataList.size(); i++) {
                for (int j = i + 1; j < flightDataList.size(); j++) {
                    evaluatedPairs++;
                    FlightWithTelemetry f1 = flightDataList.get(i);
                    FlightWithTelemetry f2 = flightDataList.get(j);

                    double distHoriz = calculateHaversineDistance(
                            f1.telemetry().latitude(), f1.telemetry().longitude(),
                            f2.telemetry().latitude(), f2.telemetry().longitude());
                    double distVert = Math.abs(f1.telemetry().altitude() - f2.telemetry().altitude());

                    CpaResult cpa = calculateCpa(f1.telemetry(), f2.telemetry());
                    boolean isSeparationLoss = (distHoriz < horizontalThresholdM) && (distVert < verticalThresholdM);
                    boolean isPredictedLoss = (cpa.tcpa() > 0.0 && cpa.tcpa() < 120.0)
                            && (cpa.dcpa() < horizontalThresholdM)
                            && (cpa.projectedVertDist() < verticalThresholdM)
                            && (distHoriz < 250.0);

                    List<Conflict> activeConflicts = conflictRepository.findActiveBetweenFlights(
                            f1.flight().id(), f2.flight().id(), ACTIVE_STATUSES);

                    if (isSeparationLoss || isPredictedLoss) {
                        ConflictSeverity severity = determineSeverity(distHoriz, distVert);
                        ConflictType conflictType = determineConflictType(f1.telemetry().heading(),
                                f2.telemetry().heading());
                        double midLat = (f1.telemetry().latitude() + f2.telemetry().latitude()) / 2.0;
                        double midLon = (f1.telemetry().longitude() + f2.telemetry().longitude()) / 2.0;
                        double midAlt = (f1.telemetry().altitude() + f2.telemetry().altitude()) / 2.0;
                        int timeToConflict = Math.max(0, (int) Math.round(cpa.tcpa()));

                        if (!activeConflicts.isEmpty()) {
                            for (Conflict existing : activeConflicts) {
                                conflictDetectionMapper.updateSeparation(
                                        existing, midLat, midLon, midAlt, distHoriz, distVert, timeToConflict,
                                        severity);
                                conflictRepository.save(existing);

                                recordOrderedSnapshot(
                                        existing,
                                        f1.flight().id(), f1.telemetry(),
                                        f2.flight().id(), f2.telemetry(),
                                        distHoriz, distVert, timeToConflict, severity);
                                existingConflictsUpdated++;
                            }
                        } else {
                            String hubId = f1.flight().departureHubId() != null
                                    ? f1.flight().departureHubId()
                                    : f2.flight().departureHubId();

                            Conflict newConflict = conflictDetectionMapper.toEntity(
                                    f1.flight(),
                                    f2.flight(),
                                    conflictType,
                                    severity,
                                    hubId,
                                    midLat,
                                    midLon,
                                    midAlt,
                                    distHoriz,
                                    distVert,
                                    timeToConflict);

                            newConflict = conflictRepository.save(newConflict);

                            recordOrderedSnapshot(
                                    newConflict,
                                    f1.flight().id(), f1.telemetry(),
                                    f2.flight().id(), f2.telemetry(),
                                    distHoriz, distVert, timeToConflict, severity);
                            newConflictsDetected++;

                            if (severity == ConflictSeverity.CRITICAL || severity == ConflictSeverity.HIGH
                                    || severity == ConflictSeverity.EMERGENCY) {
                                triggerAlert(
                                        f1.flight().droneId(),
                                        f1.flight().id(),
                                        newConflict.getId(),
                                        "CONFLICT_PROXIMITY",
                                        toAlertSeverity(severity),
                                        String.format("Loss of separation with flight %s (%.1fm)",
                                                f2.flight().flightNumber(), distHoriz),
                                        distHoriz,
                                        horizontalThresholdM);
                            }
                            if (severity == ConflictSeverity.CRITICAL) {
                                triggerEmergencyCollision(
                                        f1.flight().droneId(),
                                        f1.flight().id(),
                                        f2.flight().flightNumber(),
                                        midLat,
                                        midLon,
                                        midAlt,
                                        distHoriz,
                                        distVert);
                            }

                            log.warn(
                                    "CONFLICT DETECTED: [{} - {}] Between Flight {} ({}) and Flight {} ({}) - Dist: {}m, Vert: {}m",
                                    conflictType.getValue(), severity.getValue(),
                                    f1.flight().flightNumber(), f1.flight().id(),
                                    f2.flight().flightNumber(), f2.flight().id(),
                                    Math.round(distHoriz), Math.round(distVert));
                        }
                    } else if (!activeConflicts.isEmpty()) {
                        if (distHoriz > (horizontalThresholdM + 50.0) || distVert > (verticalThresholdM + 10.0)) {
                            for (Conflict existing : activeConflicts) {
                                conflictDetectionMapper.resolveConflictAuto(existing, "SYSTEM_AUTO");
                                conflictRepository.save(existing);
                                resolvedConflictsCount++;
                                autoResolveLinkedAlerts(existing.getId(), "Flights cleared safe separation buffer");
                                log.info(
                                        "CONFLICT AUTO-RESOLVED: Conflict {} cleared safe separation buffer (dist: {}m, vert: {}m)",
                                        existing.getId(), Math.round(distHoriz), Math.round(distVert));
                            }
                        }
                    }
                }
            }
        }

        return conflictDetectionMapper.toScanResultVm(
                flightDataList.size(),
                evaluatedPairs,
                newConflictsDetected,
                existingConflictsUpdated,
                resolvedConflictsCount,
                ZonedDateTime.now());
    }

    @Override
    public StrategicTrajectoryCheckResultVm checkTrajectory4D(StrategicTrajectoryCheckPostVm request) {
        if (request == null || request.waypoints() == null || request.waypoints().size() < 2) {
            return new StrategicTrajectoryCheckResultVm(true, 0, List.of(),
                    "Trajectory clear (insufficient waypoints for 4D comparison)");
        }

        List<StrategicTrajectoryPointVm> candidatePoints = request.waypoints();
        double speedMps = (request.speedMps() != null && request.speedMps() > 0.5) ? request.speedMps() : 15.0;
        double candidateDist = computeRouteDistance(candidatePoints);
        ZonedDateTime reqStart = request.scheduledDeparture() != null ? request.scheduledDeparture()
                : ZonedDateTime.now();
        ZonedDateTime reqEnd = (request.scheduledArrival() != null && request.scheduledArrival().isAfter(reqStart))
                ? request.scheduledArrival()
                : reqStart.plusSeconds(Math.max(60L, (long) Math.ceil(candidateDist / speedMps)));

        List<FlightBriefVm> existingFlights = fetchAllNonTerminalFlights();
        List<TrajectoryConflictDetailVm> conflicts = new ArrayList<>();
        int evaluatedCount = 0;

        for (FlightBriefVm other : existingFlights) {
            if (other == null || other.id() == null) {
                continue;
            }
            if (request.excludeFlightId() != null && request.excludeFlightId().equals(other.id())) {
                continue;
            }
            if (other.status() != null
                    && TERMINAL_FLIGHT_STATUSES.contains(other.status().trim().toLowerCase(Locale.ROOT))) {
                continue;
            }
            List<StrategicTrajectoryPointVm> otherPoints = extractWaypointsFromPlannedRoute(
                    other.plannedRoute(), other.cruisingAltitudeM());
            if (otherPoints.size() < 2) {
                continue;
            }

            ZonedDateTime otherStart = other.scheduledDeparture() != null ? other.scheduledDeparture() : reqStart;
            double otherDist = computeRouteDistance(otherPoints);
            ZonedDateTime otherEnd = (other.scheduledArrival() != null && other.scheduledArrival().isAfter(otherStart))
                    ? other.scheduledArrival()
                    : otherStart.plusSeconds(Math.max(60L, (long) Math.ceil(otherDist / 15.0)));

            ZonedDateTime overlapStart = reqStart.isAfter(otherStart) ? reqStart : otherStart;
            ZonedDateTime overlapEnd = reqEnd.isBefore(otherEnd) ? reqEnd : otherEnd;
            if (!overlapEnd.isAfter(overlapStart)) {
                continue;
            }

            evaluatedCount++;
            long overlapSec = Duration.between(overlapStart, overlapEnd).getSeconds();
            long stepSec = Math.max(STRATEGIC_SAMPLE_STEP_SEC,
                    (long) Math.ceil((double) overlapSec / MAX_STRATEGIC_SAMPLES));

            TrajectoryConflictDetailVm worstConflict = null;
            double minCombinedDist = Double.MAX_VALUE;

            for (long offset = 0; offset <= overlapSec; offset += stepSec) {
                ZonedDateTime sampleTime = overlapStart.plusSeconds(offset);
                double f1 = fractionInWindow(reqStart, reqEnd, sampleTime);
                double f2 = fractionInWindow(otherStart, otherEnd, sampleTime);

                StrategicTrajectoryPointVm p1 = interpolatePoint(candidatePoints, f1);
                StrategicTrajectoryPointVm p2 = interpolatePoint(otherPoints, f2);

                double distHoriz = calculateHaversineDistance(p1.lat(), p1.lon(), p2.lat(), p2.lon());
                double distVert = Math.abs(p1.alt() - p2.alt());
                if (distHoriz < horizontalThresholdM && distVert < verticalThresholdM) {
                    double combined = Math.hypot(distHoriz, distVert * 5.0);
                    if (combined < minCombinedDist) {
                        minCombinedDist = combined;
                        ConflictSeverity sev = determineSeverity(distHoriz, distVert);
                        worstConflict = new TrajectoryConflictDetailVm(
                                other.id(),
                                other.flightNumber(),
                                Math.round(distHoriz * 10.0) / 10.0,
                                Math.round(distVert * 10.0) / 10.0,
                                sampleTime,
                                (p1.lat() + p2.lat()) / 2.0,
                                (p1.lon() + p2.lon()) / 2.0,
                                (p1.alt() + p2.alt()) / 2.0,
                                sev.getValue(),
                                String.format(Locale.US,
                                        "Predicted 4D separation loss with %s at %s (horiz=%.1fm < %.0fm, vert=%.1fm < %.0fm)",
                                        other.flightNumber() != null ? other.flightNumber() : other.id(),
                                        sampleTime, distHoriz, horizontalThresholdM, distVert, verticalThresholdM));
                    }
                }
            }

            if (worstConflict != null) {
                conflicts.add(worstConflict);
            }
        }

        boolean clear = conflicts.isEmpty();
        String recommendation = clear
                ? "4D trajectory is clear of all scheduled and active flights."
                : String.format(Locale.US,
                        "Detected %d strategic 4D conflict(s). Recommend delaying departure by +180s or adjusting cruising altitude by +40m.",
                        conflicts.size());
        return new StrategicTrajectoryCheckResultVm(clear, evaluatedCount, conflicts, recommendation);
    }

    private List<FlightBriefVm> fetchAllNonTerminalFlights() {
        try {
            String url = serviceUrlConfig.getFlightUrl() + "/api/v1/flights?limit=0";
            FlightListBriefVm response = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(FlightListBriefVm.class);
            return response != null && response.items() != null ? response.items() : Collections.emptyList();
        } catch (Exception ex) {
            log.debug("Failed to query scheduled/active flights for 4D deconfliction: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }

    private List<StrategicTrajectoryPointVm> extractWaypointsFromPlannedRoute(JsonNode routeNode, Double defaultAlt) {
        if (routeNode == null) {
            return List.of();
        }
        JsonNode coords = routeNode.has("coordinates") ? routeNode.get("coordinates") : null;
        if (coords == null || !coords.isArray()) {
            return List.of();
        }
        double fallbackAlt = defaultAlt != null ? defaultAlt : 50.0;
        List<StrategicTrajectoryPointVm> points = new ArrayList<>();
        for (JsonNode c : coords) {
            if (c != null && c.isArray() && c.size() >= 2) {
                double lon = c.get(0).asDouble();
                double lat = c.get(1).asDouble();
                double alt = c.size() >= 3 && !c.get(2).isNull() ? c.get(2).asDouble() : fallbackAlt;
                points.add(new StrategicTrajectoryPointVm(lat, lon, alt));
            }
        }
        return points;
    }

    private double computeRouteDistance(List<StrategicTrajectoryPointVm> points) {
        double total = 0.0;
        for (int i = 0; i < points.size() - 1; i++) {
            total += calculateHaversineDistance(
                    points.get(i).lat(), points.get(i).lon(),
                    points.get(i + 1).lat(), points.get(i + 1).lon());
        }
        return total;
    }

    private double fractionInWindow(ZonedDateTime start, ZonedDateTime end, ZonedDateTime target) {
        long total = Math.max(1L, Duration.between(start, end).getSeconds());
        long elapsed = Duration.between(start, target).getSeconds();
        return Math.max(0.0, Math.min(1.0, (double) elapsed / total));
    }

    private StrategicTrajectoryPointVm interpolatePoint(List<StrategicTrajectoryPointVm> points, double fraction) {
        if (fraction <= 0.0 || points.size() == 1) {
            return points.getFirst();
        }
        if (fraction >= 1.0) {
            return points.getLast();
        }
        double totalDist = computeRouteDistance(points);
        if (totalDist <= 0.001) {
            return points.getFirst();
        }
        double targetDist = totalDist * fraction;
        double acc = 0.0;
        for (int i = 0; i < points.size() - 1; i++) {
            StrategicTrajectoryPointVm p1 = points.get(i);
            StrategicTrajectoryPointVm p2 = points.get(i + 1);
            double seg = calculateHaversineDistance(p1.lat(), p1.lon(), p2.lat(), p2.lon());
            if (acc + seg >= targetDist && seg > 0.001) {
                double localFrac = (targetDist - acc) / seg;
                return new StrategicTrajectoryPointVm(
                        p1.lat() + localFrac * (p2.lat() - p1.lat()),
                        p1.lon() + localFrac * (p2.lon() - p1.lon()),
                        p1.alt() + localFrac * (p2.alt() - p1.alt()));
            }
            acc += seg;
        }
        return points.getLast();
    }

    private <T> T runInTransactionResult(java.util.function.Supplier<T> supplier) {
        if (transactionTemplate != null) {
            return transactionTemplate.execute(status -> supplier.get());
        }
        return supplier.get();
    }

    private void recordOrderedSnapshot(
            Conflict conflict,
            String flightAId,
            TelemetryBriefVm telA,
            String flightBId,
            TelemetryBriefVm telB,
            double distHoriz,
            double distVert,
            int timeToConflict,
            ConflictSeverity severity) {
        boolean reversed = conflict != null
                && conflict.getPrimaryFlightId() != null
                && flightBId != null
                && conflict.getPrimaryFlightId().equals(flightBId)
                && !conflict.getPrimaryFlightId().equals(flightAId);
        TelemetryBriefVm primaryTel = reversed ? telB : telA;
        TelemetryBriefVm secondaryTel = reversed ? telA : telB;
        conflictSnapshotService.recordSnapshot(
                conflict,
                primaryTel.latitude(), primaryTel.longitude(), primaryTel.altitude(),
                secondaryTel.latitude(), secondaryTel.longitude(), secondaryTel.altitude(),
                distHoriz, distVert, timeToConflict, severity);
    }

    private String extractFirstZoneId(AirspaceCheckResponseVm check) {
        if (check == null || check.violations() == null || check.violations().isEmpty()) {
            return null;
        }
        Object first = check.violations().getFirst();
        if (first instanceof Map<?, ?> map) {
            Object zoneId = map.get("zoneId");
            if (zoneId != null && !zoneId.toString().isBlank()) {
                return zoneId.toString().trim();
            }
        } else if (first instanceof String str && !str.isBlank()) {
            return str.trim();
        }
        return null;
    }

    private List<FlightBriefVm> fetchActiveFlightsCached() {
        CachedActiveFlights cached = activeFlightsCache.get();
        long nowMs = System.currentTimeMillis();
        if (cached != null && (nowMs - cached.fetchedAtMs()) < ACTIVE_FLIGHTS_CACHE_TTL_MS) {
            return cached.flights();
        }
        return fetchActiveFlights();
    }

    private List<FlightBriefVm> fetchActiveFlights() {
        try {
            String url = serviceUrlConfig.getFlightUrl() + "/api/v1/flights?status=active&limit=0";
            FlightListBriefVm response = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(FlightListBriefVm.class);
            List<FlightBriefVm> items = response != null && response.items() != null
                    ? response.items()
                    : Collections.emptyList();
            activeFlightsCache.set(new CachedActiveFlights(items, System.currentTimeMillis()));
            return items;
        } catch (Exception ex) {
            log.debug("Failed to query active flights from flight service: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }

    private void cacheLatestTelemetry(String flightId, TelemetryBriefVm telemetry) {
        if (flightId == null || telemetry == null) {
            return;
        }
        Instant now = Instant.now();
        if (latestTelemetryCache.size() >= MAX_CACHED_TELEMETRY_FLIGHTS
                && !latestTelemetryCache.containsKey(flightId)) {
            Instant cutoff = now.minusSeconds(TELEMETRY_CACHE_TTL_SECONDS);
            latestTelemetryCache.entrySet().removeIf(entry -> entry.getValue().cachedAt().isBefore(cutoff));
            if (latestTelemetryCache.size() >= MAX_CACHED_TELEMETRY_FLIGHTS) {
                latestTelemetryCache.clear();
            }
        }
        latestTelemetryCache.put(flightId, new CachedTelemetry(telemetry, now));
    }

    private TelemetryBriefVm getCachedOrFetchLatestTelemetry(String flightId) {
        CachedTelemetry cached = latestTelemetryCache.get(flightId);
        if (cached != null && !cached.cachedAt().isBefore(Instant.now().minusSeconds(TELEMETRY_CACHE_TTL_SECONDS))) {
            return cached.telemetry();
        }
        TelemetryBriefVm fetched = fetchLatestTelemetry(flightId);
        if (fetched != null) {
            cacheLatestTelemetry(flightId, fetched);
        }
        return fetched;
    }

    private TelemetryBriefVm fetchLatestTelemetry(String flightId) {
        try {
            String url = serviceUrlConfig.getTelemetryUrl() + "/api/v1/telemetry/flight/" + flightId + "/latest";
            return restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(TelemetryBriefVm.class);
        } catch (Exception ex) {
            log.debug("No latest telemetry record for flight {}: {}", flightId, ex.getMessage());
            return null;
        }
    }

    private AirspaceCheckResponseVm checkAirspaceCompliance(TelemetryBriefVm telemetry) {
        try {
            String url = serviceUrlConfig.getAirspaceUrl() + "/api/v1/airspace/check";
            return restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new AirspaceCheckPostVm(telemetry.latitude(), telemetry.longitude(), telemetry.altitude()))
                    .retrieve()
                    .body(AirspaceCheckResponseVm.class);
        } catch (Exception ex) {
            log.debug("Airspace compliance check failed for telemetry [lat={}, lon={}, alt={}]: {}",
                    telemetry.latitude(), telemetry.longitude(), telemetry.altitude(), ex.getMessage());
            return null;
        }
    }

    private static String toAlertSeverity(ConflictSeverity severity) {
        if (severity == null) {
            return "HIGH";
        }
        return switch (severity) {
            case EMERGENCY, CRITICAL -> "CRITICAL";
            case HIGH -> "HIGH";
            case WARNING, MEDIUM -> "MEDIUM";
            case LOW -> "LOW";
        };
    }

    private void triggerAlert(
            String droneId,
            String flightId,
            String conflictId,
            String alertType,
            String severity,
            String message,
            Double breachValue,
            Double thresholdValue) {
        try {
            String url = serviceUrlConfig.getAlertUrl() + "/api/v1/alerts";
            Map<String, Object> details = (breachValue != null || thresholdValue != null)
                    ? Map.of(
                            "breachValue", breachValue != null ? Math.round(breachValue * 100.0) / 100.0 : 0.0,
                            "thresholdValue", thresholdValue != null ? Math.round(thresholdValue * 100.0) / 100.0 : 0.0)
                    : null;
            AlertTriggerPostVm payload = new AlertTriggerPostVm(
                    alertType,
                    severity,
                    flightId,
                    droneId,
                    null,
                    conflictId,
                    null,
                    message,
                    details);
            restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Triggered operational alert [{}] for flight '{}' in alert service", alertType, flightId);
        } catch (Exception ex) {
            log.warn("Failed to trigger operational alert in alert service for flight '{}': {}", flightId,
                    ex.getMessage());
        }
    }

    private void autoResolveLinkedAlerts(String conflictId, String resolutionNotes) {
        if (conflictId == null || conflictId.isBlank()) {
            return;
        }
        try {
            String url = serviceUrlConfig.getAlertUrl() + "/api/v1/alerts/resolve-by-conflict/" + conflictId;
            restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("resolutionNotes", resolutionNotes))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ex) {
            log.debug("Could not auto-resolve alerts for conflict '{}': {}", conflictId, ex.getMessage());
        }
    }

    private void triggerEmergencyCollision(
            String droneId,
            String flightId,
            String otherFlightNumber,
            double midLat,
            double midLon,
            double midAlt,
            double distHoriz,
            double distVert) {
        String emergencyUrl = serviceUrlConfig.getEmergencyUrl();
        if (emergencyUrl == null || emergencyUrl.isBlank() || droneId == null || droneId.isBlank()) {
            return;
        }
        try {
            String url = emergencyUrl + "/api/v1/emergency/incidents";
            EmergencyReportPostVm payload = new EmergencyReportPostVm(
                    droneId,
                    flightId,
                    "collision_aircraft",
                    "emergency",
                    String.format(Locale.US,
                            "CRITICAL mid-air separation loss with flight %s (horiz=%.1fm, vert=%.1fm)",
                            otherFlightNumber != null ? otherFlightNumber : "unknown", distHoriz, distVert),
                    Map.of(
                            "horizontalDistanceM", Math.round(distHoriz * 10.0) / 10.0,
                            "verticalDistanceM", Math.round(distVert * 10.0) / 10.0,
                            "otherFlightNumber", otherFlightNumber != null ? otherFlightNumber : ""),
                    midLat,
                    midLon,
                    midAlt);
            restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
            log.warn("Escalated CRITICAL collision_aircraft emergency for flight '{}' (drone '{}')", flightId, droneId);
        } catch (Exception ex) {
            log.warn("Failed to escalate collision emergency for flight '{}': {}", flightId, ex.getMessage());
        }
    }

    private ConflictSeverity determineSeverity(double distHoriz, double distVert) {
        if (distHoriz < criticalHorizontalM && distVert < criticalVerticalM) {
            return ConflictSeverity.CRITICAL;
        } else if (distHoriz < (criticalHorizontalM + 50.0) && distVert < (criticalVerticalM + 10.0)) {
            return ConflictSeverity.HIGH;
        } else if (distHoriz < horizontalThresholdM && distVert < verticalThresholdM) {
            return ConflictSeverity.MEDIUM;
        }
        return ConflictSeverity.LOW;
    }

    private ConflictType determineConflictType(Double heading1, Double heading2) {
        if (heading1 == null || heading2 == null) {
            return ConflictType.SEPARATION_MINIMUM;
        }
        double diff = Math.abs(heading1 - heading2);
        if (diff > 180.0) {
            diff = 360.0 - diff;
        }
        if (diff >= 140.0) {
            return ConflictType.HEAD_ON;
        } else if (diff >= 45.0) {
            return ConflictType.CONVERGENCE;
        }
        return ConflictType.SEPARATION_MINIMUM;
    }

    private double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                        * Math.sin(dLon / 2.0) * Math.sin(dLon / 2.0);
        double c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
        return EARTH_RADIUS_M * c;
    }

    private CpaResult calculateCpa(TelemetryBriefVm t1, TelemetryBriefVm t2) {
        double speed1 = resolveDouble(t1.speed(), 0.0);
        double speed2 = resolveDouble(t2.speed(), 0.0);
        double heading1 = resolveDouble(t1.heading(), 0.0);
        double heading2 = resolveDouble(t2.heading(), 0.0);

        double lat1 = resolveDouble(t1.latitude(), 0.0);
        double lat2 = resolveDouble(t2.latitude(), 0.0);
        double lon1 = resolveDouble(t1.longitude(), 0.0);
        double lon2 = resolveDouble(t2.longitude(), 0.0);

        double latRad = Math.toRadians((lat1 + lat2) / 2.0);
        double dx = Math.toRadians(lon2 - lon1) * EARTH_RADIUS_M * Math.cos(latRad);
        double dy = Math.toRadians(lat2 - lat1) * EARTH_RADIUS_M;
        double currentDistance = Math.hypot(dx, dy);
        double alt1 = resolveDouble(t1.altitude(), 0.0);
        double alt2 = resolveDouble(t2.altitude(), 0.0);
        double currentVertDist = Math.abs(alt2 - alt1);

        if (speed1 < 0.1 && speed2 < 0.1) {
            return new CpaResult(0.0, currentDistance, currentVertDist);
        }

        double vx1 = speed1 * Math.sin(Math.toRadians(heading1));
        double vy1 = speed1 * Math.cos(Math.toRadians(heading1));
        double vx2 = speed2 * Math.sin(Math.toRadians(heading2));
        double vy2 = speed2 * Math.cos(Math.toRadians(heading2));

        double dvx = vx2 - vx1;
        double dvy = vy2 - vy1;
        double vrelSq = dvx * dvx + dvy * dvy;

        if (vrelSq < 0.01) {
            return new CpaResult(0.0, currentDistance, currentVertDist);
        }

        double tcpa = -(dx * dvx + dy * dvy) / vrelSq;
        if (tcpa <= 0.0) {
            return new CpaResult(0.0, currentDistance, currentVertDist);
        }
        double dcpa = Math.hypot(dx + dvx * tcpa, dy + dvy * tcpa);
        double vz1 = resolveDouble(t1.verticalSpeed(), 0.0);
        double vz2 = resolveDouble(t2.verticalSpeed(), 0.0);
        double projectedVertDist = Math.abs((alt2 + vz2 * tcpa) - (alt1 + vz1 * tcpa));
        return new CpaResult(tcpa, dcpa, projectedVertDist);
    }

    private static double resolveDouble(Double value, double defaultValue) {
        return value != null ? value : defaultValue;
    }

    private record FlightWithTelemetry(FlightBriefVm flight, TelemetryBriefVm telemetry) {
    }

    private record CachedTelemetry(TelemetryBriefVm telemetry, Instant cachedAt) {
    }

    private record CachedActiveFlights(List<FlightBriefVm> flights, long fetchedAtMs) {
    }

    private record CpaResult(double tcpa, double dcpa, double projectedVertDist) {
    }
}

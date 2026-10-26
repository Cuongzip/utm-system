package com.utm.conflict.service;

import com.utm.conflict.config.ServiceUrlConfig;
import com.utm.conflict.mapper.ConflictDetectionMapper;
import com.utm.conflict.model.Conflict;
import com.utm.conflict.model.enumeration.ConflictSeverity;
import com.utm.conflict.model.enumeration.ConflictStatus;
import com.utm.conflict.model.enumeration.ConflictType;
import com.utm.conflict.repository.ConflictRepository;
import com.utm.conflict.viewmodel.AirspaceCheckPostVm;
import com.utm.conflict.viewmodel.AirspaceCheckResponseVm;
import com.utm.conflict.viewmodel.AlertTriggerPostVm;
import com.utm.conflict.viewmodel.ConflictScanResultVm;
import com.utm.conflict.viewmodel.FlightBriefVm;
import com.utm.conflict.viewmodel.FlightListBriefVm;
import com.utm.conflict.viewmodel.TelemetryBriefVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConflictDetectionServiceImpl implements ConflictDetectionService {

    private static final double EARTH_RADIUS_M = 6_371_000.0;
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

    @Value("${utm.conflict.watchdog.enabled:true}")
    private boolean watchdogEnabled;

    @Value("${utm.conflict.threshold.horizontal-m:150.0}")
    private double horizontalThresholdM;

    @Value("${utm.conflict.threshold.vertical-m:30.0}")
    private double verticalThresholdM;

    @Value("${utm.conflict.threshold.critical-horizontal-m:50.0}")
    private double criticalHorizontalM;

    @Value("${utm.conflict.threshold.critical-vertical-m:15.0}")
    private double criticalVerticalM;

    @Scheduled(fixedDelayString = "${utm.conflict.watchdog.interval-ms:5000}")
    public void scheduledWatchdogScan() {
        if (!watchdogEnabled) {
            return;
        }
        try {
            runConflictScan();
        } catch (Exception ex) {
            log.warn("Conflict detection watchdog cycle encountered exception: {}", ex.getMessage());
        }
    }

    @Override
    @Transactional
    public ConflictScanResultVm runConflictScan() {
        List<FlightBriefVm> activeFlights = fetchActiveFlights();
        if (activeFlights.isEmpty()) {
            return conflictDetectionMapper.toScanResultVm(0, 0, 0, 0, 0, ZonedDateTime.now());
        }

        List<FlightWithTelemetry> flightDataList = new ArrayList<>();
        for (FlightBriefVm flight : activeFlights) {
            TelemetryBriefVm telemetry = fetchLatestTelemetry(flight.id());
            if (telemetry != null && telemetry.latitude() != null && telemetry.longitude() != null
                    && telemetry.altitude() != null) {
                flightDataList.add(new FlightWithTelemetry(flight, telemetry));
            }
        }

        int evaluatedPairs = 0;
        int newConflictsDetected = 0;
        int existingConflictsUpdated = 0;
        int resolvedConflictsCount = 0;

        for (FlightWithTelemetry ft : flightDataList) {
            AirspaceCheckResponseVm airspaceCheck = checkAirspaceCompliance(ft.telemetry());
            if (airspaceCheck != null && !airspaceCheck.safe()) {
                List<Conflict> existingSingleConflicts = conflictRepository
                        .findByPrimaryFlightIdAndStatusIn(ft.flight().id(), ACTIVE_STATUSES)
                        .stream()
                        .filter(c -> c.getSecondaryFlightId() == null)
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
                            "AIRSPACE_BREACH",
                            "CRITICAL",
                            "Flight breached restricted airspace zone",
                            ft.telemetry().altitude(),
                            120.0);
                    log.warn("SINGLE-FLIGHT CONFLICT DETECTED: Flight {} ({}) breached airspace zone",
                            ft.flight().flightNumber(), ft.flight().id());
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

                    double tcpa = calculateTcpa(f1.telemetry(), f2.telemetry());
                    boolean isSeparationLoss = (distHoriz < horizontalThresholdM) && (distVert < verticalThresholdM);
                    boolean isPredictedLoss = (tcpa > 0.0 && tcpa < 120.0) && (distVert < verticalThresholdM)
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
                        int timeToConflict = Math.max(0, (int) Math.round(tcpa));

                        if (!activeConflicts.isEmpty()) {
                            for (Conflict existing : activeConflicts) {
                                conflictDetectionMapper.updateSeparation(
                                        existing, midLat, midLon, midAlt, distHoriz, distVert, timeToConflict,
                                        severity);
                                conflictRepository.save(existing);

                                conflictSnapshotService.recordSnapshot(
                                        existing,
                                        f1.telemetry().latitude(), f1.telemetry().longitude(),
                                        f1.telemetry().altitude(),
                                        f2.telemetry().latitude(), f2.telemetry().longitude(),
                                        f2.telemetry().altitude(),
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

                            conflictSnapshotService.recordSnapshot(
                                    newConflict,
                                    f1.telemetry().latitude(), f1.telemetry().longitude(), f1.telemetry().altitude(),
                                    f2.telemetry().latitude(), f2.telemetry().longitude(), f2.telemetry().altitude(),
                                    distHoriz, distVert, timeToConflict, severity);
                            newConflictsDetected++;

                            if (severity == ConflictSeverity.CRITICAL || severity == ConflictSeverity.HIGH) {
                                triggerAlert(
                                        f1.flight().droneId(),
                                        f1.flight().id(),
                                        "CONFLICT_PROXIMITY",
                                        severity.getValue(),
                                        String.format("Loss of separation with flight %s (%.1fm)",
                                                f2.flight().flightNumber(), distHoriz),
                                        distHoriz,
                                        horizontalThresholdM);
                            }

                            log.warn(
                                    "CONFLICT DETECTED: [{} - {}] Between Flight {} ({}) and Flight {} ({}) - Dist: {}m, Vert: {}m",
                                    conflictType.getValue(), severity.getValue(),
                                    f1.flight().flightNumber(), f1.flight().id(),
                                    f2.flight().flightNumber(), f2.flight().id(),
                                    Math.round(distHoriz), Math.round(distVert));
                        }
                    } else if (!activeConflicts.isEmpty()) {
                        // Safe buffer reached (horizontal > 200m or vertical > 40m)
                        if (distHoriz > (horizontalThresholdM + 50.0) || distVert > (verticalThresholdM + 10.0)) {
                            for (Conflict existing : activeConflicts) {
                                conflictDetectionMapper.resolveConflictAuto(existing, "SYSTEM_AUTO");
                                conflictRepository.save(existing);
                                resolvedConflictsCount++;
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

    private List<FlightBriefVm> fetchActiveFlights() {
        try {
            String baseUrl = serviceUrlConfig.flight();
            String basePath = (baseUrl != null && baseUrl.endsWith("/flight")) ? "" : "/flight";
            String url = baseUrl + basePath + "/api/v1/flights?status=active&limit=0";
            FlightListBriefVm response = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(FlightListBriefVm.class);
            return response != null && response.items() != null ? response.items() : Collections.emptyList();
        } catch (Exception ex) {
            log.debug("Failed to query active flights from flight service: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }

    private TelemetryBriefVm fetchLatestTelemetry(String flightId) {
        try {
            String baseUrl = serviceUrlConfig.telemetry();
            String basePath = (baseUrl != null && baseUrl.endsWith("/telemetry")) ? "" : "/telemetry";
            String url = baseUrl + basePath + "/api/v1/telemetry/flight/" + flightId + "/latest";
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
        if (serviceUrlConfig.airspace() == null || serviceUrlConfig.airspace().isBlank()) {
            return null;
        }
        try {
            String baseUrl = serviceUrlConfig.airspace();
            String basePath = (baseUrl != null && baseUrl.endsWith("/airspace")) ? "" : "/airspace";
            String url = baseUrl + basePath + "/api/v1/airspace/check";
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

    private void triggerAlert(
            String droneId,
            String flightId,
            String alertType,
            String severity,
            String message,
            Double breachValue,
            Double thresholdValue) {
        if (serviceUrlConfig.alert() == null || serviceUrlConfig.alert().isBlank()) {
            return;
        }
        try {
            String baseUrl = serviceUrlConfig.alert();
            String basePath = (baseUrl != null && baseUrl.endsWith("/alert")) ? "" : "/alert";
            String url = baseUrl + basePath + "/api/v1/alerts";
            String detailsJson = (breachValue != null || thresholdValue != null)
                    ? String.format(java.util.Locale.US, "{\"breachValue\": %.2f, \"thresholdValue\": %.2f}",
                            breachValue != null ? breachValue : 0.0, thresholdValue != null ? thresholdValue : 0.0)
                    : null;
            AlertTriggerPostVm payload = new AlertTriggerPostVm(
                    alertType,
                    severity,
                    flightId,
                    droneId,
                    null,
                    message,
                    detailsJson
            );
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

    private double calculateTcpa(TelemetryBriefVm t1, TelemetryBriefVm t2) {
        double speed1 = resolveDouble(t1.speed(), 0.0);
        double speed2 = resolveDouble(t2.speed(), 0.0);
        double heading1 = resolveDouble(t1.heading(), 0.0);
        double heading2 = resolveDouble(t2.heading(), 0.0);

        if (speed1 < 0.1 && speed2 < 0.1) {
            return 0.0;
        }

        double lat1 = resolveDouble(t1.latitude(), 0.0);
        double lat2 = resolveDouble(t2.latitude(), 0.0);
        double lon1 = resolveDouble(t1.longitude(), 0.0);
        double lon2 = resolveDouble(t2.longitude(), 0.0);

        double latRad = Math.toRadians((lat1 + lat2) / 2.0);
        double dx = Math.toRadians(lon2 - lon1) * EARTH_RADIUS_M * Math.cos(latRad);
        double dy = Math.toRadians(lat2 - lat1) * EARTH_RADIUS_M;

        double vx1 = speed1 * Math.sin(Math.toRadians(heading1));
        double vy1 = speed1 * Math.cos(Math.toRadians(heading1));
        double vx2 = speed2 * Math.sin(Math.toRadians(heading2));
        double vy2 = speed2 * Math.cos(Math.toRadians(heading2));

        double dvx = vx2 - vx1;
        double dvy = vy2 - vy1;
        double vrelSq = dvx * dvx + dvy * dvy;

        if (vrelSq < 0.01) {
            return 0.0;
        }

        double tcpa = -(dx * dvx + dy * dvy) / vrelSq;
        return tcpa > 0.0 ? tcpa : 0.0;
    }

    private static double resolveDouble(Double value, double defaultValue) {
        if (value != null) {
            return value;
        }
        return defaultValue;
    }

    private record FlightWithTelemetry(FlightBriefVm flight, TelemetryBriefVm telemetry) {
    }
}

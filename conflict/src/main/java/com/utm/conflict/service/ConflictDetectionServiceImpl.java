package com.utm.conflict.service;

import com.utm.conflict.config.ServiceUrlConfig;
import com.utm.conflict.model.Conflict;
import com.utm.conflict.model.enumeration.ConflictSeverity;
import com.utm.conflict.model.enumeration.ConflictStatus;
import com.utm.conflict.model.enumeration.ConflictType;
import com.utm.conflict.model.enumeration.ResolutionStrategy;
import com.utm.conflict.repository.ConflictRepository;
import com.utm.conflict.viewmodel.ConflictScanResultVm;
import com.utm.conflict.viewmodel.FlightClientVm;
import com.utm.conflict.viewmodel.TelemetryRecordClientVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
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
            ConflictStatus.RESOLVING
    );

    private final ConflictRepository conflictRepository;
    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

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
        List<FlightClientVm> activeFlights = fetchActiveFlights();
        if (activeFlights.isEmpty() || activeFlights.size() < 2) {
            return new ConflictScanResultVm(
                    activeFlights.size(),
                    0,
                    0,
                    0,
                    0,
                    ZonedDateTime.now()
            );
        }

        List<FlightWithTelemetry> flightDataList = new ArrayList<>();
        for (FlightClientVm flight : activeFlights) {
            TelemetryRecordClientVm telemetry = fetchLatestTelemetry(flight.id());
            if (telemetry != null && telemetry.latitude() != null && telemetry.longitude() != null && telemetry.altitude() != null) {
                flightDataList.add(new FlightWithTelemetry(flight, telemetry));
            }
        }

        int evaluatedPairs = 0;
        int newConflictsDetected = 0;
        int existingConflictsUpdated = 0;
        int resolvedConflictsCount = 0;

        for (int i = 0; i < flightDataList.size(); i++) {
            for (int j = i + 1; j < flightDataList.size(); j++) {
                evaluatedPairs++;
                FlightWithTelemetry f1 = flightDataList.get(i);
                FlightWithTelemetry f2 = flightDataList.get(j);

                double distHoriz = calculateHaversineDistance(
                        f1.telemetry().latitude(), f1.telemetry().longitude(),
                        f2.telemetry().latitude(), f2.telemetry().longitude()
                );
                double distVert = Math.abs(f1.telemetry().altitude() - f2.telemetry().altitude());

                double tcpa = calculateTcpa(f1.telemetry(), f2.telemetry());
                boolean isSeparationLoss = (distHoriz < horizontalThresholdM) && (distVert < verticalThresholdM);
                boolean isPredictedLoss = (tcpa > 0.0 && tcpa < 120.0) && (distVert < verticalThresholdM) && (distHoriz < 250.0);

                List<Conflict> activeConflicts = conflictRepository.findActiveBetweenFlights(
                        f1.flight().id(), f2.flight().id(), ACTIVE_STATUSES
                );

                if (isSeparationLoss || isPredictedLoss) {
                    ConflictSeverity severity = determineSeverity(distHoriz, distVert);
                    ConflictType conflictType = determineConflictType(f1.telemetry().heading(), f2.telemetry().heading());
                    double midLat = (f1.telemetry().latitude() + f2.telemetry().latitude()) / 2.0;
                    double midLon = (f1.telemetry().longitude() + f2.telemetry().longitude()) / 2.0;
                    double midAlt = (f1.telemetry().altitude() + f2.telemetry().altitude()) / 2.0;
                    int timeToConflict = Math.max(0, (int) Math.round(tcpa));

                    if (!activeConflicts.isEmpty()) {
                        for (Conflict existing : activeConflicts) {
                            existing.setSeparationDistance(Math.min(existing.getSeparationDistance(), distHoriz));
                            existing.setVerticalSeparation(distVert);
                            existing.setLocationLat(midLat);
                            existing.setLocationLon(midLon);
                            existing.setAltitude(midAlt);
                            existing.setTimeToConflictSec(timeToConflict);
                            existing.setSeverity(severity);
                            conflictRepository.save(existing);
                            existingConflictsUpdated++;
                        }
                    } else {
                        String hubId = f1.flight().departureHubId() != null
                                ? f1.flight().departureHubId()
                                : f2.flight().departureHubId();

                        Conflict newConflict = Conflict.builder()
                                .conflictType(conflictType)
                                .severity(severity)
                                .status(ConflictStatus.DETECTED)
                                .primaryFlightId(f1.flight().id())
                                .secondaryFlightId(f2.flight().id())
                                .hubId(hubId)
                                .detectedAt(ZonedDateTime.now())
                                .detectionMethod("automated_telemetry")
                                .locationLat(midLat)
                                .locationLon(midLon)
                                .altitude(midAlt)
                                .separationDistance(distHoriz)
                                .verticalSeparation(distVert)
                                .timeToConflictSec(timeToConflict)
                                .description(String.format("Loss of separation between flight %s and %s (horiz: %.1fm, vert: %.1fm)",
                                        f1.flight().flightNumber(), f2.flight().flightNumber(), distHoriz, distVert))
                                .build();

                        conflictRepository.save(newConflict);
                        newConflictsDetected++;
                        log.warn("CONFLICT DETECTED: [{} - {}] Between Flight {} ({}) and Flight {} ({}) - Dist: {}m, Vert: {}m",
                                conflictType.getValue(), severity.getValue(),
                                f1.flight().flightNumber(), f1.flight().id(),
                                f2.flight().flightNumber(), f2.flight().id(),
                                Math.round(distHoriz), Math.round(distVert));
                    }
                } else if (!activeConflicts.isEmpty()) {
                    // Safe buffer reached (horizontal > 200m or vertical > 40m)
                    if (distHoriz > (horizontalThresholdM + 50.0) || distVert > (verticalThresholdM + 10.0)) {
                        for (Conflict existing : activeConflicts) {
                            existing.setStatus(ConflictStatus.RESOLVED);
                            existing.setResolutionStrategy(ResolutionStrategy.AUTO_CLEARED);
                            existing.setResolvedAt(ZonedDateTime.now());
                            existing.setResolvedBy("SYSTEM_AUTO");
                            conflictRepository.save(existing);
                            resolvedConflictsCount++;
                            log.info("CONFLICT AUTO-RESOLVED: Conflict {} cleared safe separation buffer (dist: {}m, vert: {}m)",
                                    existing.getId(), Math.round(distHoriz), Math.round(distVert));
                        }
                    }
                }
            }
        }

        return new ConflictScanResultVm(
                flightDataList.size(),
                evaluatedPairs,
                newConflictsDetected,
                existingConflictsUpdated,
                resolvedConflictsCount,
                ZonedDateTime.now()
        );
    }

    private List<FlightClientVm> fetchActiveFlights() {
        try {
            String baseUrl = serviceUrlConfig.flight();
            String basePath = (baseUrl != null && baseUrl.endsWith("/flight")) ? "" : "/flight";
            String url = baseUrl + basePath + "/api/v1/flights?status=active";
            List<FlightClientVm> flights = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            return flights != null ? flights : Collections.emptyList();
        } catch (Exception ex) {
            log.debug("Failed to query active flights from flight service: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }

    private TelemetryRecordClientVm fetchLatestTelemetry(String flightId) {
        try {
            String baseUrl = serviceUrlConfig.telemetry();
            String basePath = (baseUrl != null && baseUrl.endsWith("/telemetry")) ? "" : "/telemetry";
            String url = baseUrl + basePath + "/api/v1/telemetry/flight/" + flightId + "/latest";
            return restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(TelemetryRecordClientVm.class);
        } catch (Exception ex) {
            log.debug("No latest telemetry record for flight {}: {}", flightId, ex.getMessage());
            return null;
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

    private double calculateTcpa(TelemetryRecordClientVm t1, TelemetryRecordClientVm t2) {
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

    private record FlightWithTelemetry(FlightClientVm flight, TelemetryRecordClientVm telemetry) {}
}

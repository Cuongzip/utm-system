package com.utm.flight.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.flight.mapper.FlightConformanceMapper;
import com.utm.flight.model.Flight;
import com.utm.flight.model.FlightConformance;
import com.utm.flight.model.FlightWaypoint;
import com.utm.flight.model.enumeration.ConformanceStatus;
import com.utm.flight.model.enumeration.FlightStatus;
import com.utm.flight.repository.FlightConformanceRepository;
import com.utm.flight.repository.FlightRepository;
import com.utm.flight.viewmodel.AlertPostVm;
import com.utm.flight.viewmodel.FlightConformanceVm;
import com.utm.flight.viewmodel.TelemetryRecordVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class FlightConformanceServiceImpl implements FlightConformanceService {

    private static final double EARTH_RADIUS_M = 6371000.0;
    private static final long TELEMETRY_TIMEOUT_NON_CONFORMING_SEC = 30L;
    private static final long TELEMETRY_TIMEOUT_CONTINGENT_SEC = 90L;

    private final FlightRepository flightRepository;
    private final FlightConformanceRepository conformanceRepository;
    private final AlertClientService alertClientService;
    private final TelemetryClientService telemetryClientService;
    private final FlightConformanceMapper conformanceMapper;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(readOnly = true)
    public FlightConformanceVm getConformance(String flightId) {
        FlightConformance conformance = conformanceRepository.findByFlightId(flightId)
                .orElseGet(() -> {
                    Flight flight = flightRepository.findById(flightId)
                            .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, flightId));
                    return FlightConformance.builder()
                            .flight(flight)
                            .status(flight.getStatus() == FlightStatus.ACTIVE ? ConformanceStatus.UNKNOWN : ConformanceStatus.CONFORMANT)
                            .corridorRadiusM(15.0)
                            .altitudeBufferM(10.0)
                            .lastEvaluatedAt(ZonedDateTime.now())
                            .build();
                });

        return conformanceMapper.toVm(conformance);
    }

    @Override
    @Transactional
    public FlightConformanceVm evaluateFlightConformance(String flightId) {
        Flight flight = flightRepository.findById(flightId)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, flightId));

        FlightConformance evaluated = doEvaluateConformance(flight);
        return conformanceMapper.toVm(evaluated);
    }

    @Override
    @Scheduled(fixedDelay = 5000)
    @Transactional
    public void checkActiveFlightsConformance() {
        List<Flight> activeFlights = flightRepository.findByStatus(FlightStatus.ACTIVE);
        if (activeFlights.isEmpty()) {
            return;
        }

        log.debug("Running 4D conformance watchdog for {} active flight(s)", activeFlights.size());
        for (Flight flight : activeFlights) {
            try {
                doEvaluateConformance(flight);
            } catch (Exception ex) {
                log.error("Failed to evaluate conformance for flight '{}': {}", flight.getId(), ex.getMessage(), ex);
            }
        }
    }

    private FlightConformance doEvaluateConformance(Flight flight) {
        FlightConformance conformance = conformanceRepository.findByFlightId(flight.getId())
                .orElseGet(() -> FlightConformance.builder()
                        .flight(flight)
                        .corridorRadiusM(15.0)
                        .altitudeBufferM(10.0)
                        .status(ConformanceStatus.UNKNOWN)
                        .build());

        ZonedDateTime now = ZonedDateTime.now();
        conformance.setLastEvaluatedAt(now);

        Optional<TelemetryRecordVm> telemetryOpt = telemetryClientService.getLatestFlightTelemetry(flight.getId());
        if (telemetryOpt.isEmpty()) {
            handleMissingTelemetry(flight, conformance, now);
            return conformanceRepository.save(conformance);
        }

        TelemetryRecordVm telemetry = telemetryOpt.get();
        conformanceMapper.updateFromTelemetry(conformance, telemetry);

        long ageSeconds = Math.max(0, Duration.between(telemetry.getEffectiveTimestamp(), now).getSeconds());
        if (ageSeconds > TELEMETRY_TIMEOUT_CONTINGENT_SEC) {
            transitionStatus(flight, conformance, ConformanceStatus.CONTINGENT, "C2_LINK_LOST_CONTINGENT", "CRITICAL",
                    String.format("Telemetry connection lost for %d seconds (exceeded %ds emergency threshold)",
                            ageSeconds, TELEMETRY_TIMEOUT_CONTINGENT_SEC), Map.of("telemetryAgeSeconds", ageSeconds));
            return conformanceRepository.save(conformance);
        }

        if (ageSeconds > TELEMETRY_TIMEOUT_NON_CONFORMING_SEC) {
            transitionStatus(flight, conformance, ConformanceStatus.NON_CONFORMING, "C2_LINK_LOST", "HIGH",
                    String.format("Telemetry connection lost for %d seconds (exceeded %ds warning threshold)",
                            ageSeconds, TELEMETRY_TIMEOUT_NON_CONFORMING_SEC), Map.of("telemetryAgeSeconds", ageSeconds));
            return conformanceRepository.save(conformance);
        }

        List<FlightWaypoint> waypoints = flight.getWaypoints();
        Double cruisingAltitude = flight.getCruisingAltitudeM();

        CrossTrackResult result = calculateCrossTrackError(
                telemetry.latitude(),
                telemetry.longitude(),
                telemetry.altitude(),
                waypoints,
                cruisingAltitude
        );

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

        conformance.setViolationsJson(serializeViolations(violations));

        if (isLateralBreached || isVerticalBreached) {
            String alertType = isLateralBreached && isVerticalBreached ? "3D_VOLUME_BREACH"
                    : (isLateralBreached ? "LATERAL_CORRIDOR_BREACH" : "VERTICAL_ALTITUDE_BREACH");
            String message = String.join("; ", violations);

            transitionStatus(flight, conformance, ConformanceStatus.NON_CONFORMING, alertType, "HIGH", message,
                    Map.of(
                            "crossTrackErrorM", result.crossTrackDistanceM(),
                            "verticalErrorM", result.verticalErrorM(),
                            "corridorRadiusM", conformance.getCorridorRadiusM(),
                            "altitudeBufferM", conformance.getAltitudeBufferM()
                    ));
        } else {
            if (conformance.getStatus() == ConformanceStatus.NON_CONFORMING || conformance.getStatus() == ConformanceStatus.CONTINGENT) {
                transitionStatus(flight, conformance, ConformanceStatus.CONFORMANT, "RECOVERY_CONFORMANT", "LOW",
                        "Drone position recovered and returned into designated 4D flight volume",
                        Map.of("crossTrackErrorM", result.crossTrackDistanceM(), "verticalErrorM", result.verticalErrorM()));
            } else {
                conformance.setStatus(ConformanceStatus.CONFORMANT);
            }
        }

        return conformanceRepository.save(conformance);
    }

    private void handleMissingTelemetry(Flight flight, FlightConformance conformance, ZonedDateTime now) {
        if (flight.getStatus() == FlightStatus.ACTIVE) {
            ZonedDateTime departureTime = flight.getActualDeparture() != null
                    ? flight.getActualDeparture()
                    : (flight.getScheduledDeparture() != null ? flight.getScheduledDeparture() : now);
            long flightDurationSec = Math.max(0, Duration.between(departureTime, now).getSeconds());

            if (flightDurationSec > TELEMETRY_TIMEOUT_NON_CONFORMING_SEC) {
                transitionStatus(flight, conformance, ConformanceStatus.NON_CONFORMING, "NO_TELEMETRY_STREAM", "HIGH",
                        "Flight is marked ACTIVE but no telemetry packets have been received", Collections.emptyMap());
            } else {
                conformance.setStatus(ConformanceStatus.UNKNOWN);
            }
        } else {
            conformance.setStatus(ConformanceStatus.CONFORMANT);
        }
    }

    private void transitionStatus(Flight flight, FlightConformance conformance, ConformanceStatus newStatus,
                                  String alertType, String severity, String message, Map<String, Object> details) {
        ConformanceStatus prevStatus = conformance.getStatus();
        conformance.setStatus(newStatus);

        boolean isSignificantChange = prevStatus != newStatus || "RECOVERY_CONFORMANT".equals(alertType);
        if (isSignificantChange) {
            String detailsJson = null;
            if (details != null && !details.isEmpty()) {
                try {
                    detailsJson = objectMapper.writeValueAsString(details);
                } catch (JsonProcessingException ignored) {
                }
            }

            String droneId = flight.getDroneId();
            String hubId = flight.getDepartureHubId();

            AlertPostVm alertPostVm = new AlertPostVm(
                    alertType,
                    severity,
                    flight.getId(),
                    droneId,
                    hubId,
                    message,
                    detailsJson
            );

            alertClientService.createAlert(alertPostVm);
            log.warn("Conformance event [{}] for flight '{}' ({} -> {}): {}",
                    alertType, flight.getId(), prevStatus, newStatus, message);
        }
    }

    private String serializeViolations(List<String> violations) {
        if (violations == null || violations.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(violations);
        } catch (JsonProcessingException e) {
            return "[]";
        }
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
            List<FlightWaypoint> waypoints, Double cruisingAltitude) {
        if (waypoints == null || waypoints.isEmpty()) {
            return new CrossTrackResult(0.0, 0.0);
        }

        if (waypoints.size() == 1) {
            FlightWaypoint w = waypoints.getFirst();
            double dist = calculateHaversineDistance(w.getLatitude(), w.getLongitude(), pLat, pLon);
            double nominalAlt = resolveAltitude(w.getAltitude(), cruisingAltitude, pAlt);
            double vError = Math.abs(pAlt - nominalAlt);
            return new CrossTrackResult(dist, vError);
        }

        double minDistance = Double.MAX_VALUE;
        double correspondingVerticalError = 0.0;

        for (int i = 0; i < waypoints.size() - 1; i++) {
            FlightWaypoint w1 = waypoints.get(i);
            FlightWaypoint w2 = waypoints.get(i + 1);

            double d12 = calculateHaversineDistance(w1.getLatitude(), w1.getLongitude(), w2.getLatitude(), w2.getLongitude());
            double d13 = calculateHaversineDistance(w1.getLatitude(), w1.getLongitude(), pLat, pLon);

            double brg12 = calculateBearing(w1.getLatitude(), w1.getLongitude(), w2.getLatitude(), w2.getLongitude());
            double brg13 = calculateBearing(w1.getLatitude(), w1.getLongitude(), pLat, pLon);

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
            if (dat < 0) {
                distanceToSegment = d13;
                fractionOnSegment = 0.0;
            } else if (dat > d12) {
                distanceToSegment = calculateHaversineDistance(w2.getLatitude(), w2.getLongitude(), pLat, pLon);
                fractionOnSegment = 1.0;
            } else {
                distanceToSegment = dxt;
                fractionOnSegment = (d12 > 0) ? dat / d12 : 0.0;
            }

            if (distanceToSegment < minDistance) {
                minDistance = distanceToSegment;
                double nominalAlt1 = resolveAltitude(w1.getAltitude(), cruisingAltitude, 50.0);
                double nominalAlt2 = resolveAltitude(w2.getAltitude(), cruisingAltitude, 50.0);
                double expectedAlt = nominalAlt1 + fractionOnSegment * (nominalAlt2 - nominalAlt1);
                correspondingVerticalError = Math.abs(pAlt - expectedAlt);
            }
        }

        return new CrossTrackResult(minDistance, correspondingVerticalError);
    }

    private static double resolveAltitude(Double waypointAlt, Double cruisingAlt, double defaultAlt) {
        if (waypointAlt != null) {
            return waypointAlt;
        }
        if (cruisingAlt != null) {
            return cruisingAlt;
        }
        return defaultAlt;
    }

    private record CrossTrackResult(double crossTrackDistanceM, double verticalErrorM) {}
}

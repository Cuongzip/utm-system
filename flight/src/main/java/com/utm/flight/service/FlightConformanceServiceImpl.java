package com.utm.flight.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.flight.mapper.FlightConformanceMapper;
import com.utm.flight.model.Flight;
import com.utm.flight.model.FlightConformance;
import com.utm.flight.model.enumeration.ConformanceStatus;
import com.utm.flight.model.enumeration.FlightStatus;
import com.utm.flight.repository.FlightConformanceRepository;
import com.utm.flight.repository.FlightRepository;
import com.utm.flight.viewmodel.FlightConformanceVm;
import com.utm.flight.viewmodel.GeoJsonLineStringVm;
import com.utm.flight.viewmodel.TelemetryBriefVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
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
                    return conformanceMapper.toEntity(flight);
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
                .orElseGet(() -> conformanceMapper.toEntity(flight));

        ZonedDateTime now = ZonedDateTime.now();
        conformance.setLastEvaluatedAt(now);

        Optional<TelemetryBriefVm> telemetryOpt = telemetryClientService.getLatestFlightTelemetry(flight.getId());
        if (telemetryOpt.isEmpty()) {
            handleMissingTelemetry(flight, conformance, now);
            updateFlightStatusAndSave(flight, conformance);
            return conformanceRepository.save(conformance);
        }

        TelemetryBriefVm telemetry = telemetryOpt.get();
        conformanceMapper.updateFromTelemetry(conformance, telemetry);

        long ageSeconds = Math.max(0, Duration.between(telemetry.getEffectiveTimestamp(), now).getSeconds());
        if (ageSeconds > TELEMETRY_TIMEOUT_CONTINGENT_SEC) {
            transitionStatus(flight, conformance, ConformanceStatus.CONTINGENT,
                    String.format("Telemetry lost for %d seconds (exceeded %ds emergency threshold)",
                            ageSeconds, TELEMETRY_TIMEOUT_CONTINGENT_SEC));
            updateFlightStatusAndSave(flight, conformance);
            return conformanceRepository.save(conformance);
        }

        if (ageSeconds > TELEMETRY_TIMEOUT_NON_CONFORMING_SEC) {
            transitionStatus(flight, conformance, ConformanceStatus.NON_CONFORMING,
                    String.format("Telemetry lost for %d seconds (exceeded %ds warning threshold)",
                            ageSeconds, TELEMETRY_TIMEOUT_NON_CONFORMING_SEC));
            updateFlightStatusAndSave(flight, conformance);
            return conformanceRepository.save(conformance);
        }

        List<List<Double>> routeCoordinates = extractRouteCoordinates(flight.getPlannedRoute());
        Double cruisingAltitude = flight.getCruisingAltitudeM();

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

        conformance.setViolationsJson(serializeViolations(violations));

        if (result.crossTrackDistanceM() > 30.0 || (isLateralBreached && isVerticalBreached)) {
            transitionStatus(flight, conformance, ConformanceStatus.NON_CONFORMING,
                    String.join("; ", violations));
        } else if (isLateralBreached || isVerticalBreached) {
            transitionStatus(flight, conformance, ConformanceStatus.CONTINGENT,
                    String.join("; ", violations));
        } else {
            transitionStatus(flight, conformance, ConformanceStatus.CONFORMANT,
                    "Drone on planned 4D corridor trajectory");
        }

        updateFlightStatusAndSave(flight, conformance);
        return conformanceRepository.save(conformance);
    }

    private void updateFlightStatusAndSave(Flight flight, FlightConformance conformance) {
        if (flight.getConformanceStatus() != conformance.getStatus()) {
            flight.setConformanceStatus(conformance.getStatus());
            flightRepository.save(flight);
        }
    }

    private void transitionStatus(Flight flight, FlightConformance conformance,
                                 ConformanceStatus newStatus, String message) {
        ConformanceStatus prevStatus = conformance.getStatus();
        conformance.setStatus(newStatus);

        if (prevStatus != newStatus) {
            log.info("Flight '{}' conformance transitioned: {} -> {}. Message: {}",
                    flight.getId(), prevStatus, newStatus, message);

            if (newStatus == ConformanceStatus.NON_CONFORMING) {
                log.warn("NON_CONFORMING breach detected for Flight '{}' (Flight Number: {}). Flagging conflict event for ATC.",
                        flight.getId(), flight.getFlightNumber());
            }
        }
    }

    private void handleMissingTelemetry(Flight flight, FlightConformance conformance, ZonedDateTime now) {
        if (flight.getStatus() == FlightStatus.ACTIVE) {
            ZonedDateTime referenceTime = conformance.getLastTelemetryTime() != null
                    ? conformance.getLastTelemetryTime()
                    : (flight.getActualDeparture() != null ? flight.getActualDeparture() : now);

            long missingSec = Math.max(0, Duration.between(referenceTime, now).getSeconds());

            if (missingSec > TELEMETRY_TIMEOUT_CONTINGENT_SEC) {
                transitionStatus(flight, conformance, ConformanceStatus.CONTINGENT,
                        "Telemetry lost for " + missingSec + " seconds");
            } else if (missingSec > TELEMETRY_TIMEOUT_NON_CONFORMING_SEC) {
                transitionStatus(flight, conformance, ConformanceStatus.NON_CONFORMING,
                        "Telemetry lost for " + missingSec + " seconds");
            }
        }
    }

    private List<List<Double>> extractRouteCoordinates(String plannedRouteJson) {
        if (plannedRouteJson == null || plannedRouteJson.isBlank()) {
            return List.of();
        }
        try {
            GeoJsonLineStringVm lineString = objectMapper.readValue(plannedRouteJson, GeoJsonLineStringVm.class);
            return lineString.coordinates() != null ? lineString.coordinates() : List.of();
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse plannedRoute JSON: {}", e.getMessage());
            return List.of();
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
            if (dat < 0) {
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
}

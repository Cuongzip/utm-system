package com.utm.emergency.kafka;

import static com.utm.emergency.kafka.TelemetryKafkaListenerConfig.TELEMETRY_LISTENER_CONTAINER_FACTORY;

import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.kafka.cdc.BaseCdcConsumer;
import com.utm.commonlibrary.kafka.cdc.RetrySupportDql;
import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
import com.utm.emergency.service.EmergencyIncidentService;
import com.utm.emergency.service.client.WeatherAisClientService;
import com.utm.emergency.service.client.WeatherAisClientService.AdsbAircraftBriefVm;
import com.utm.emergency.viewmodel.client.TelemetryStreamVm;
import com.utm.emergency.viewmodel.incident.EmergencyIncidentPostVm;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.MessageHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Headers;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class TelemetryEmergencyDetectorConsumer extends BaseCdcConsumer<String, TelemetryStreamVm> {

    private static final double EARTH_RADIUS_M = 6_371_000.0;
    private static final long WINDOW_SECONDS = 60L;
    private static final long MIN_OBSERVATION_SECONDS = 15L;
    private static final double RAPID_DISCHARGE_WARNING_PCT_PER_MIN = 2.0;
    private static final double RAPID_DISCHARGE_CRITICAL_PCT_PER_MIN = 5.0;
    private static final double MIN_DROP_DELTA_PCT = 2.0;
    private static final double AIRCRAFT_WARNING_DISTANCE_M = 1000.0;
    private static final double AIRCRAFT_CRITICAL_DISTANCE_M = 500.0;
    private static final double AIRCRAFT_VERTICAL_BUFFER_M = 150.0;
    private static final long ALERT_COOLDOWN_SECONDS = 120L;

    private final EmergencyIncidentService emergencyIncidentService;
    private final WeatherAisClientService weatherAisClientService;
    private final Map<String, Deque<BatterySample>> batteryWindows = new ConcurrentHashMap<>();
    private final Map<String, Instant> lastAlertedAt = new ConcurrentHashMap<>();

    public TelemetryEmergencyDetectorConsumer(EmergencyIncidentService emergencyIncidentService) {
        this(emergencyIncidentService, null);
    }

    @Autowired
    public TelemetryEmergencyDetectorConsumer(
            EmergencyIncidentService emergencyIncidentService,
            @Autowired(required = false) WeatherAisClientService weatherAisClientService) {
        this.emergencyIncidentService = emergencyIncidentService;
        this.weatherAisClientService = weatherAisClientService;
    }

    @KafkaListener(
            id = "emergency-telemetry-detector",
            groupId = "${spring.kafka.consumer.group-id:emergency-service}",
            topics = "${utm.kafka.topic.telemetry-ingest:utm.telemetry.ingest}",
            containerFactory = TELEMETRY_LISTENER_CONTAINER_FACTORY
    )
    @RetrySupportDql(listenerContainerFactory = TELEMETRY_LISTENER_CONTAINER_FACTORY)
    public void processMessage(
            @Header(value = KafkaHeaders.RECEIVED_KEY, required = false) String key,
            @Payload(required = false) TelemetryStreamVm telemetry,
            @Headers MessageHeaders headers
    ) {
        processMessage(key, telemetry, headers, this::onTelemetryReceived);
    }

    public void onTelemetryReceived(String key, TelemetryStreamVm telemetry) {
        if (telemetry == null || telemetry.droneId() == null || telemetry.droneId().isBlank()) {
            return;
        }

        Instant sampleTime = telemetry.timestamp() != null ? telemetry.timestamp().toInstant() : Instant.now();
        String droneId = telemetry.droneId().trim();

        evaluateInstantSensorThresholds(droneId, sampleTime, telemetry);
        evaluateAdsbAircraftProximity(droneId, sampleTime, telemetry);

        if (telemetry.batteryPercentage() == null) {
            return;
        }

        Deque<BatterySample> window = batteryWindows.computeIfAbsent(droneId, k -> new ArrayDeque<>());
        synchronized (window) {
            window.addLast(new BatterySample(sampleTime, telemetry.batteryPercentage()));
            Instant cutoff = sampleTime.minusSeconds(WINDOW_SECONDS);
            while (!window.isEmpty() && window.peekFirst().timestamp().isBefore(cutoff)) {
                window.pollFirst();
            }
            if (window.size() < 2) {
                return;
            }

            BatterySample oldest = window.peekFirst();
            BatterySample newest = window.peekLast();
            long elapsedSec = Duration.between(oldest.timestamp(), newest.timestamp()).getSeconds();
            if (elapsedSec < MIN_OBSERVATION_SECONDS) {
                return;
            }

            double dropPct = oldest.batteryPercentage() - newest.batteryPercentage();
            if (dropPct < MIN_DROP_DELTA_PCT) {
                return;
            }

            double ratePctPerMin = (dropPct / elapsedSec) * 60.0;
            if (ratePctPerMin < RAPID_DISCHARGE_WARNING_PCT_PER_MIN) {
                return;
            }

            boolean critical = ratePctPerMin >= RAPID_DISCHARGE_CRITICAL_PCT_PER_MIN;
            String cooldownKey = droneId + (critical ? ":BATTERY_RAPID_DISCHARGE_CRIT" : ":BATTERY_RAPID_DISCHARGE_WARN");
            if (isOnCooldown(cooldownKey, sampleTime)) {
                return;
            }

            EmergencySeverity sev = critical ? EmergencySeverity.CRITICAL : EmergencySeverity.WARNING;
            String message = String.format(
                    "%s battery discharge detected: %.1f%%/min (dropped %.1f%% in %ds, current %.1f%%)",
                    critical ? "Rapid" : "Elevated", ratePctPerMin, dropPct, elapsedSec, newest.batteryPercentage());
            log.warn("Emergency detector triggering battery_rapid_discharge ({}) for drone {}: {}", sev, droneId, message);

            reportIncidentSafely(
                    droneId,
                    telemetry,
                    EmergencyType.BATTERY_RAPID_DISCHARGE,
                    sev,
                    message,
                    Map.of(
                            "dischargeRatePercentPerMin", Math.round(ratePctPerMin * 10.0) / 10.0,
                            "batteryPercentage", newest.batteryPercentage(),
                            "dropPercent", Math.round(dropPct * 10.0) / 10.0,
                            "windowSeconds", elapsedSec));
        }
    }

    private void evaluateInstantSensorThresholds(String droneId, Instant sampleTime, TelemetryStreamVm telemetry) {
        Double batt = telemetry.batteryPercentage();
        if (batt != null) {
            if (batt <= 5.0 && !isOnCooldown(droneId + ":BATTERY_EMERGENCY", sampleTime)) {
                reportIncidentSafely(droneId, telemetry, EmergencyType.BATTERY_CRITICAL, EmergencySeverity.EMERGENCY,
                        String.format("Emergency battery exhaustion imminent: %.1f%% remaining", batt),
                        Map.of("batteryPercentage", batt));
            } else if (batt <= 10.0 && batt > 5.0 && !isOnCooldown(droneId + ":BATTERY_CRITICAL", sampleTime)) {
                reportIncidentSafely(droneId, telemetry, EmergencyType.BATTERY_CRITICAL, EmergencySeverity.CRITICAL,
                        String.format("Critical low battery threshold breached: %.1f%% remaining", batt),
                        Map.of("batteryPercentage", batt));
            } else if (batt <= 25.0 && batt > 10.0 && !isOnCooldown(droneId + ":BATTERY_LOW", sampleTime)) {
                reportIncidentSafely(droneId, telemetry, EmergencyType.BATTERY_LOW, EmergencySeverity.WARNING,
                        String.format("Low battery warning: %.1f%% remaining", batt),
                        Map.of("batteryPercentage", batt));
            }
        }

        Double signal = telemetry.signalStrength();
        if (signal != null) {
            if (signal < 20.0 && !isOnCooldown(droneId + ":SIGNAL_LOST", sampleTime)) {
                reportIncidentSafely(droneId, telemetry, EmergencyType.SIGNAL_LOST, EmergencySeverity.CRITICAL,
                        String.format("C2 link critically degraded / lost: signal %.1f%%", signal),
                        buildSensorData(telemetry, "signalStrength", signal));
            } else if (signal < 50.0 && !isOnCooldown(droneId + ":SIGNAL_WEAK", sampleTime)) {
                reportIncidentSafely(droneId, telemetry, EmergencyType.SIGNAL_WEAK, EmergencySeverity.WARNING,
                        String.format("Weak C2 signal quality detected: %.1f%%", signal),
                        buildSensorData(telemetry, "signalStrength", signal));
            }
        }

        Double hdop = telemetry.gpsHdop();
        Integer sats = telemetry.gpsSatellites();
        if (hdop != null || sats != null) {
            boolean lost = (hdop != null && hdop > 5.0) || (sats != null && sats < 4);
            boolean degraded = !lost && ((hdop != null && hdop > 2.0) || (sats != null && sats < 6));
            if (lost && !isOnCooldown(droneId + ":GPS_LOST", sampleTime)) {
                reportIncidentSafely(droneId, telemetry, EmergencyType.GPS_LOST, EmergencySeverity.CRITICAL,
                        String.format("GPS fix lost (HDOP=%s, satellites=%s)", hdop, sats),
                        buildSensorData(telemetry, "gpsHdop", hdop));
            } else if (degraded && !isOnCooldown(droneId + ":GPS_DEGRADED", sampleTime)) {
                reportIncidentSafely(droneId, telemetry, EmergencyType.GPS_DEGRADED, EmergencySeverity.WARNING,
                        String.format("GPS precision degraded (HDOP=%s, satellites=%s)", hdop, sats),
                        buildSensorData(telemetry, "gpsHdop", hdop));
            }
        }
    }

    private void evaluateAdsbAircraftProximity(String droneId, Instant sampleTime, TelemetryStreamVm telemetry) {
        if (weatherAisClientService == null || telemetry.latitude() == null || telemetry.longitude() == null) {
            return;
        }
        List<AdsbAircraftBriefVm> aircraft = weatherAisClientService.getLiveAircraft();
        if (aircraft == null || aircraft.isEmpty()) {
            return;
        }
        double droneAlt = telemetry.altitude() != null ? telemetry.altitude() : 0.0;
        for (AdsbAircraftBriefVm ac : aircraft) {
            if (ac == null || Boolean.TRUE.equals(ac.onGround()) || ac.latitude() == null || ac.longitude() == null) {
                continue;
            }
            Double acAlt = ac.effectiveAltitudeM();
            if (acAlt != null && Math.abs(acAlt - droneAlt) > AIRCRAFT_VERTICAL_BUFFER_M) {
                continue;
            }
            double distM = haversineMeters(telemetry.latitude(), telemetry.longitude(), ac.latitude(), ac.longitude());
            if (distM >= AIRCRAFT_WARNING_DISTANCE_M) {
                continue;
            }
            boolean imminent = distM < AIRCRAFT_CRITICAL_DISTANCE_M;
            String key = droneId + (imminent ? ":COLLISION_AIRCRAFT_EMG" : ":COLLISION_AIRCRAFT_CRIT");
            if (isOnCooldown(key, sampleTime)) {
                return;
            }
            String callsign = ac.callsign() != null && !ac.callsign().isBlank() ? ac.callsign().trim() : ac.hex();
            EmergencySeverity severity = imminent ? EmergencySeverity.EMERGENCY : EmergencySeverity.CRITICAL;
            String message = imminent
                    ? String.format("AIRCRAFT PROXIMITY ALERT: %s at %.0fm", callsign, distM)
                    : String.format("Manned aircraft %s detected within %.0fm", callsign, distM);
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("distanceM", Math.round(distM * 10.0) / 10.0);
            data.put("threatType", "aircraft");
            data.put("aircraftCallsign", callsign != null ? callsign : "");
            if (ac.hex() != null) {
                data.put("aircraftHex", ac.hex());
            }
            if (telemetry.batteryPercentage() != null) {
                data.put("batteryPercentage", telemetry.batteryPercentage());
            }
            reportIncidentSafely(droneId, telemetry, EmergencyType.COLLISION_AIRCRAFT, severity, message, data);
            return;
        }
    }

    private static double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                        * Math.sin(dLon / 2.0) * Math.sin(dLon / 2.0);
        return EARTH_RADIUS_M * 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
    }

    private Map<String, Object> buildSensorData(TelemetryStreamVm telemetry, String metricKey, Object metricVal) {
        Map<String, Object> map = new LinkedHashMap<>();
        if (metricVal != null) {
            map.put(metricKey, metricVal);
        }
        if (telemetry.batteryPercentage() != null) {
            map.put("batteryPercentage", telemetry.batteryPercentage());
        }
        if (telemetry.gpsSatellites() != null) {
            map.put("gpsSatellites", telemetry.gpsSatellites());
        }
        return map;
    }

    private boolean isOnCooldown(String cooldownKey, Instant sampleTime) {
        Instant lastSent = lastAlertedAt.get(cooldownKey);
        if (lastSent != null && Duration.between(lastSent, sampleTime).getSeconds() < ALERT_COOLDOWN_SECONDS) {
            return true;
        }
        lastAlertedAt.put(cooldownKey, sampleTime);
        return false;
    }

    private void reportIncidentSafely(
            String droneId,
            TelemetryStreamVm telemetry,
            EmergencyType type,
            EmergencySeverity severity,
            String message,
            Map<String, Object> detectionData) {
        try {
            emergencyIncidentService.createIncident(
                    new EmergencyIncidentPostVm(
                            null,
                            droneId,
                            telemetry.flightId(),
                            type,
                            severity,
                            message,
                            detectionData,
                            telemetry.latitude(),
                            telemetry.longitude(),
                            telemetry.altitude()),
                    "telemetry-detector");
        } catch (DuplicatedException dup) {
            log.debug("Skipping duplicate {} incident for drone {}: {}", type, droneId, dup.getMessage());
        }
    }

    private record BatterySample(Instant timestamp, double batteryPercentage) {
    }
}

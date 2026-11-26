package com.utm.conflict.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.conflict.config.ServiceUrlConfig;
import com.utm.conflict.mapper.ConflictMapper;
import com.utm.conflict.model.Conflict;
import com.utm.conflict.model.enumeration.ConflictSeverity;
import com.utm.conflict.model.enumeration.ConflictStatus;
import com.utm.conflict.model.enumeration.ResolutionStrategy;
import com.utm.conflict.repository.ConflictRepository;
import com.utm.conflict.model.enumeration.ConflictType;
import com.utm.conflict.viewmodel.client.AlertTriggerPostVm;
import com.utm.conflict.viewmodel.client.FlightBriefVm;
import com.utm.conflict.viewmodel.conflict.ConflictPostVm;
import com.utm.conflict.viewmodel.conflict.ConflictResolutionAdviceVm;
import com.utm.conflict.viewmodel.conflict.ConflictResolvePostVm;
import com.utm.conflict.viewmodel.conflict.ConflictVm;
import com.utm.conflict.viewmodel.conflict.ResolutionAdviceOptionVm;
import lombok.extern.slf4j.Slf4j;
import jakarta.persistence.criteria.Predicate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.client.RestClient;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Service
@Slf4j
@Transactional
public class ConflictServiceImpl implements ConflictService {

    private static final List<ConflictStatus> ACTIVE_STATUSES = List.of(
            ConflictStatus.DETECTED,
            ConflictStatus.NOTIFIED,
            ConflictStatus.ACKNOWLEDGED,
            ConflictStatus.RESOLVING);

    private final ConflictRepository conflictRepository;
    private final ConflictMapper conflictMapper;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Autowired
    public ConflictServiceImpl(
            ConflictRepository conflictRepository,
            ConflictMapper conflictMapper,
            ObjectMapper objectMapper,
            @Autowired(required = false) RestClient restClient,
            @Autowired(required = false) ServiceUrlConfig serviceUrlConfig) {
        this.conflictRepository = conflictRepository;
        this.conflictMapper = conflictMapper;
        this.objectMapper = objectMapper;
        this.restClient = restClient;
        this.serviceUrlConfig = serviceUrlConfig;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConflictVm> getAllConflicts(String status, String severity, String flightId) {
        ConflictStatus statusEnum = (status != null && !status.isBlank()) ? ConflictStatus.fromValue(status.trim())
                : null;
        ConflictSeverity severityEnum = (severity != null && !severity.isBlank())
                ? ConflictSeverity.fromValue(severity.trim())
                : null;
        String cleanFlightId = (flightId != null && !flightId.isBlank()) ? flightId.trim() : null;

        if (statusEnum == null && severityEnum == null && cleanFlightId == null) {
            return conflictMapper.toVmList(conflictRepository.findAllByOrderByDetectedAtDesc());
        }

        Specification<Conflict> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (statusEnum != null) {
                predicates.add(cb.equal(root.get("status"), statusEnum));
            }
            if (severityEnum != null) {
                predicates.add(cb.equal(root.get("severity"), severityEnum));
            }
            if (cleanFlightId != null) {
                predicates.add(cb.or(
                        cb.equal(root.get("primaryFlightId"), cleanFlightId),
                        cb.equal(root.get("secondaryFlightId"), cleanFlightId)));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };

        return conflictMapper.toVmList(conflictRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "detectedAt")));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConflictVm> getActiveConflicts() {
        return conflictMapper.toVmList(conflictRepository.findActivePrioritized(ACTIVE_STATUSES));
    }

    @Override
    @Transactional(readOnly = true)
    public ConflictVm getConflictById(String id) {
        Conflict conflict = conflictRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.CONFLICT_NOT_FOUND, "id", id));
        return conflictMapper.toVm(conflict);
    }

    @Override
    public ConflictVm createConflict(ConflictPostVm postVm, String createdBy) {
        ConflictType typeEnum = ConflictType.fromValue(postVm.conflictType());
        if (typeEnum == null) {
            typeEnum = ConflictType.GEOFENCE_VIOLATION;
        }

        String secondaryFlightId = (postVm.secondaryFlightId() != null && !postVm.secondaryFlightId().isBlank())
                ? postVm.secondaryFlightId().trim()
                : null;
        String airspaceZoneId = (postVm.airspaceZoneId() != null && !postVm.airspaceZoneId().isBlank())
                ? postVm.airspaceZoneId().trim()
                : null;

        ConflictType finalTypeEnum = typeEnum;
        Optional<Conflict> matched;
        if (secondaryFlightId != null) {
            if (secondaryFlightId.equals(postVm.primaryFlightId().trim())) {
                throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE,
                        "Primary and secondary flight IDs must be distinct");
            }
            matched = conflictRepository.findActiveBetweenFlights(
                    postVm.primaryFlightId().trim(), secondaryFlightId, ACTIVE_STATUSES)
                    .stream()
                    .findFirst();
        } else {
            List<Conflict> existingActive = conflictRepository.findByPrimaryFlightIdAndStatusIn(
                    postVm.primaryFlightId(), ACTIVE_STATUSES);
            matched = existingActive.stream()
                    .filter(c -> c.getSecondaryFlightId() == null)
                    .filter(c -> c.getConflictType() == finalTypeEnum)
                    .filter(c -> airspaceZoneId == null || Objects.equals(airspaceZoneId, c.getAirspaceZoneId()))
                    .findFirst();
        }

        if (matched.isPresent()) {
            Conflict existing = matched.get();
            ConflictSeverity previousSeverity = existing.getSeverity();
            conflictMapper.updateEntityFromPostVm(existing, postVm);
            if (postVm.hubId() != null && !postVm.hubId().isBlank() && existing.getHubId() == null) {
                existing.setHubId(postVm.hubId().trim());
            }
            if (airspaceZoneId != null && existing.getAirspaceZoneId() == null) {
                existing.setAirspaceZoneId(airspaceZoneId);
            }
            Conflict saved = conflictRepository.save(existing);
            log.info("Updated existing active conflict {} ({}) for flight {}", saved.getId(), saved.getConflictType(),
                    saved.getPrimaryFlightId());
            if (previousSeverity != saved.getSeverity() || extractExplicitAlertType(postVm) != null) {
                runAfterCommit(() -> publishConflictAlert(saved, postVm));
            }
            return conflictMapper.toVm(saved);
        }

        Conflict entity = conflictMapper.toEntity(postVm,
                createdBy != null && !createdBy.isBlank() ? createdBy : "system");
        Conflict saved = conflictRepository.save(entity);
        log.warn("Created new conflict {} [{}-{}] for flight {}", saved.getId(), saved.getConflictType(),
                saved.getSeverity(), saved.getPrimaryFlightId());
        runAfterCommit(() -> publishConflictAlert(saved, postVm));
        return conflictMapper.toVm(saved);
    }

    @Override
    public ConflictVm acknowledgeConflict(String id, String acknowledgedBy) {
        Conflict conflict = conflictRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.CONFLICT_NOT_FOUND, "id", id));

        if (conflict.getStatus() == ConflictStatus.DETECTED || conflict.getStatus() == ConflictStatus.NOTIFIED) {
            conflict.setStatus(ConflictStatus.ACKNOWLEDGED);
            log.info("Conflict {} acknowledged by {}", id, acknowledgedBy != null ? acknowledgedBy : "operator");
        }
        Conflict saved = conflictRepository.save(conflict);
        return conflictMapper.toVm(saved);
    }

    @Override
    public ConflictVm resolveConflict(String id, ConflictResolvePostVm resolveVm, String resolvedBy) {
        Conflict conflict = conflictRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.CONFLICT_NOT_FOUND, "id", id));

        if (conflict.getStatus() == ConflictStatus.RESOLVED) {
            throw new BadRequestException(MessageCode.CONFLICT_ALREADY_RESOLVED, "id", id);
        }

        Map<String, Object> actionsCopy = resolveVm.actions() != null
                ? new LinkedHashMap<>(resolveVm.actions())
                : Map.of();

        conflict.setStatus(ConflictStatus.RESOLVED);
        conflict.setResolutionStrategy(ResolutionStrategy.fromValue(resolveVm.strategy()));
        conflict.setResolutionActions(actionsCopy.isEmpty() ? null : actionsCopy);
        conflict.setResolvedAt(ZonedDateTime.now());
        conflict.setResolvedBy(resolvedBy != null && !resolvedBy.isBlank() ? resolvedBy : "operator");

        Conflict saved = conflictRepository.save(conflict);
        log.info("Conflict {} successfully marked as resolved by {} with strategy {}", id, conflict.getResolvedBy(),
                conflict.getResolutionStrategy());

        ResolutionStrategy strategy = saved.getResolutionStrategy();
        String primaryFlightId = saved.getPrimaryFlightId();
        String resolvedByActor = saved.getResolvedBy();
        Runnable afterCommitActions = () -> {
            dispatchResolutionCommand(saved.getId(), primaryFlightId, strategy, actionsCopy);
            autoResolveLinkedAlerts(saved.getId(), "Conflict resolved by " + resolvedByActor);
        };
        runAfterCommit(afterCommitActions);

        return conflictMapper.toVm(saved);
    }

    @Override
    public int resolveConformanceConflictsByFlight(String flightId, String reason) {
        if (flightId == null || flightId.isBlank()) {
            return 0;
        }
        List<Conflict> active = conflictRepository.findByPrimaryFlightIdAndStatusIn(flightId.trim(), ACTIVE_STATUSES)
                .stream()
                .filter(c -> c.getSecondaryFlightId() == null)
                .filter(c -> c.getConflictType() == ConflictType.GEOFENCE_VIOLATION
                        || c.getConflictType() == ConflictType.EQUIPMENT_FAILURE)
                .toList();
        if (active.isEmpty()) {
            return 0;
        }
        ZonedDateTime now = ZonedDateTime.now();
        List<String> resolvedIds = new ArrayList<>();
        for (Conflict conflict : active) {
            conflict.setStatus(ConflictStatus.RESOLVED);
            conflict.setResolutionStrategy(ResolutionStrategy.AUTO_CLEARED);
            conflict.setResolvedAt(now);
            conflict.setResolvedBy("SYSTEM_AUTO");
            Conflict saved = conflictRepository.save(conflict);
            if (saved.getId() != null) {
                resolvedIds.add(saved.getId());
            }
        }
        String effectiveReason = (reason != null && !reason.isBlank())
                ? reason.trim()
                : "Flight returned to 4D corridor conformance";
        runAfterCommit(() -> {
            for (String resolvedId : resolvedIds) {
                autoResolveLinkedAlerts(resolvedId, effectiveReason);
            }
        });
        log.info("Auto-resolved {} conformance conflict(s) for flight '{}'", active.size(), flightId);
        return active.size();
    }

    @Override
    @Transactional(readOnly = true)
    public ConflictResolutionAdviceVm getResolutionAdvice(String conflictId) {
        Conflict conflict = conflictRepository.findById(conflictId)
                .orElseThrow(() -> new NotFoundException(MessageCode.CONFLICT_NOT_FOUND, "id", conflictId));

        double currentAlt = conflict.getAltitude() != null ? conflict.getAltitude() : 60.0;
        double recommendedAlt = currentAlt <= 75.0 ? Math.min(120.0, currentAlt + 40.0)
                : Math.max(25.0, currentAlt - 40.0);
        int holdDurationSec = (conflict.getTimeToConflictSec() != null && conflict.getTimeToConflictSec() > 0)
                ? Math.max(90, Math.min(120, conflict.getTimeToConflictSec() + 60))
                : 90;

        double baseLat = conflict.getLocationLat() != null ? conflict.getLocationLat() : 10.7769;
        double baseLon = conflict.getLocationLon() != null ? conflict.getLocationLon() : 106.7009;
        double offsetLat = Math.round((baseLat + (300.0 / 111_320.0)) * 1e6) / 1e6;
        double offsetLon = Math.round(
                (baseLon + (300.0 / (111_320.0 * Math.max(0.1, Math.cos(Math.toRadians(baseLat)))))) * 1e6) / 1e6;

        List<ResolutionAdviceOptionVm> options = new ArrayList<>();
        boolean isAirspaceOrGeofence = conflict.getConflictType() == ConflictType.AIRSPACE_BREACH
                || conflict.getConflictType() == ConflictType.GEOFENCE_VIOLATION;

        if (isAirspaceOrGeofence) {
            options.add(new ResolutionAdviceOptionVm(
                    "reroute",
                    1,
                    "GOTO",
                    Map.of("latitude", offsetLat, "longitude", offsetLon, "altitude", currentAlt, "offsetMeters",
                            300.0),
                    300.0,
                    45,
                    "Lateral offset 300m outside restricted boundary to clear airspace violation immediately"));
            options.add(new ResolutionAdviceOptionVm(
                    "hold",
                    2,
                    "HOVER",
                    Map.of("durationSeconds", holdDurationSec),
                    150.0,
                    holdDurationSec,
                    "Hold position in hover while ATC issues reroute clearance"));
            options.add(new ResolutionAdviceOptionVm(
                    "return_to_base",
                    3,
                    "RTL",
                    Map.of("reason", "AIRSPACE_CONFLICT_RTL"),
                    500.0,
                    120,
                    "Abort segment and return directly to departure hub"));
        } else {
            options.add(new ResolutionAdviceOptionVm(
                    "altitude_change",
                    1,
                    "SET_ALTITUDE",
                    Map.of("targetAltitude", recommendedAlt, "deltaM", recommendedAlt - currentAlt),
                    Math.abs(recommendedAlt - currentAlt),
                    15,
                    String.format(
                            "Adjust primary flight altitude from %.0fm to %.0fm for immediate vertical separation (>30m buffer)",
                            currentAlt, recommendedAlt)));
            options.add(new ResolutionAdviceOptionVm(
                    "hold",
                    2,
                    "HOVER",
                    Map.of("durationSeconds", holdDurationSec),
                    180.0,
                    holdDurationSec,
                    String.format("Hold primary flight in hover for %ds until conflicting traffic clears CPA",
                            holdDurationSec)));
            options.add(new ResolutionAdviceOptionVm(
                    "reroute",
                    3,
                    "GOTO",
                    Map.of("latitude", offsetLat, "longitude", offsetLon, "altitude", currentAlt, "offsetMeters",
                            300.0),
                    300.0,
                    45,
                    "Apply 300m lateral offset waypoint to establish wide horizontal separation"));
        }

        return new ConflictResolutionAdviceVm(
                conflict.getId(),
                conflict.getPrimaryFlightId(),
                conflict.getSecondaryFlightId(),
                conflict.getConflictType() != null ? conflict.getConflictType().getValue() : null,
                conflict.getSeverity() != null ? conflict.getSeverity().getValue() : null,
                options,
                ZonedDateTime.now());
    }

    private void dispatchResolutionCommand(String conflictId, String flightId, ResolutionStrategy strategy,
            Map<String, Object> actions) {
        if (restClient == null || serviceUrlConfig == null || flightId == null || flightId.isBlank()
                || strategy == null) {
            return;
        }
        String commandType = mapStrategyToCommandType(strategy);
        if (commandType == null) {
            return;
        }
        try {
            String flightUrl = serviceUrlConfig.getFlightUrl() + "/api/v1/flights/" + flightId;
            FlightBriefVm flight = restClient.get().uri(flightUrl).retrieve().body(FlightBriefVm.class);
            if (flight == null || flight.droneId() == null || flight.droneId().isBlank()) {
                log.debug("Skipping C2 dispatch for conflict {}: unable to resolve droneId for flight {}",
                        conflictId, flightId);
                return;
            }
            Map<String, Object> paramsMap = new LinkedHashMap<>();
            paramsMap.put("conflictId", conflictId);
            paramsMap.put("strategy", strategy.getValue());
            if (actions != null && !actions.isEmpty()) {
                paramsMap.putAll(actions);
            }
            String paramsJson = objectMapper.writeValueAsString(paramsMap);
            String cmdUrl = serviceUrlConfig.getDroneUrl() + "/api/v1/drones/" + flight.droneId() + "/commands";
            restClient.post()
                    .uri(cmdUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "commandType", commandType,
                            "flightId", flightId,
                            "priority", 1,
                            "parameters", paramsJson))
                    .retrieve()
                    .toBodilessEntity();
            log.info("Dispatched closed-loop C2 command {} to drone {} for resolved conflict {}",
                    commandType, flight.droneId(), conflictId);
        } catch (Exception ex) {
            log.warn("Failed to dispatch C2 command {} for resolved conflict {}: {}",
                    commandType, conflictId, ex.getMessage());
        }
    }

    private void runAfterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }

    private String extractExplicitAlertType(ConflictPostVm postVm) {
        if (postVm == null || postVm.data() == null) {
            return null;
        }
        Object raw = postVm.data().get("alertType");
        if (raw instanceof String str && !str.isBlank()) {
            return str.trim();
        }
        return null;
    }

    private void publishConflictAlert(Conflict conflict, ConflictPostVm postVm) {
        if (restClient == null || serviceUrlConfig == null || conflict == null || conflict.getId() == null) {
            return;
        }
        try {
            String droneId = null;
            if (postVm != null && postVm.data() != null && postVm.data().get("droneId") instanceof String d
                    && !d.isBlank()) {
                droneId = d.trim();
            }
            if (droneId == null && conflict.getPrimaryFlightId() != null && !conflict.getPrimaryFlightId().isBlank()) {
                try {
                    String flightUrl = serviceUrlConfig.getFlightUrl() + "/api/v1/flights/" + conflict.getPrimaryFlightId();
                    FlightBriefVm flight = restClient.get().uri(flightUrl).retrieve().body(FlightBriefVm.class);
                    if (flight != null && flight.droneId() != null && !flight.droneId().isBlank()) {
                        droneId = flight.droneId().trim();
                    }
                } catch (Exception ignored) {
                }
            }

            String alertType = extractExplicitAlertType(postVm);
            if (alertType == null) {
                alertType = mapConflictToAlertType(conflict.getConflictType(), conflict.getSeverity());
            }
            String alertSeverity = mapConflictToAlertSeverity(conflict.getSeverity());
            String message = (conflict.getDescription() != null && !conflict.getDescription().isBlank())
                    ? conflict.getDescription()
                    : String.format("Operational conflict [%s] detected for flight %s",
                            conflict.getConflictType() != null ? conflict.getConflictType().getValue() : "conflict",
                            conflict.getPrimaryFlightId());

            Map<String, Object> details = new LinkedHashMap<>();
            if (conflict.getConflictType() != null) {
                details.put("conflictType", conflict.getConflictType().getValue());
            }
            if (conflict.getLocationLat() != null) {
                details.put("latitude", conflict.getLocationLat());
            }
            if (conflict.getLocationLon() != null) {
                details.put("longitude", conflict.getLocationLon());
            }
            if (conflict.getAltitude() != null) {
                details.put("altitude", conflict.getAltitude());
            }
            if (conflict.getSeparationDistance() != null) {
                details.put("separationDistance", conflict.getSeparationDistance());
            }

            AlertTriggerPostVm payload = new AlertTriggerPostVm(
                    alertType,
                    alertSeverity,
                    conflict.getPrimaryFlightId(),
                    droneId,
                    conflict.getHubId(),
                    conflict.getId(),
                    null,
                    message,
                    details.isEmpty() ? null : details);

            String url = serviceUrlConfig.getAlertUrl() + "/api/v1/alerts";
            restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Published alert [type={}, severity={}] for conflict {} (flight {})",
                    alertType, alertSeverity, conflict.getId(), conflict.getPrimaryFlightId());
        } catch (Exception ex) {
            log.warn("Failed to publish alert for conflict {}: {}", conflict.getId(), ex.getMessage());
        }
    }

    private static String mapConflictToAlertType(ConflictType type, ConflictSeverity severity) {
        if (type == null) {
            return "CONFLICT";
        }
        return switch (type) {
            case EQUIPMENT_FAILURE -> (severity == ConflictSeverity.CRITICAL || severity == ConflictSeverity.EMERGENCY)
                    ? "C2_LINK_LOST_CONTINGENT"
                    : "C2_LINK_LOST";
            case GEOFENCE_VIOLATION -> "GEOFENCE_VIOLATION";
            case AIRSPACE_BREACH, RESTRICTED_ZONE -> "AIRSPACE_BREACH";
            case WEATHER -> "WEATHER_HAZARD";
            case TERRAIN_PROXIMITY -> "VERTICAL_ALTITUDE_BREACH";
            default -> "CONFLICT_PROXIMITY";
        };
    }

    private static String mapConflictToAlertSeverity(ConflictSeverity severity) {
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

    private void autoResolveLinkedAlerts(String conflictId, String resolutionNotes) {
        if (restClient == null || serviceUrlConfig == null || conflictId == null || conflictId.isBlank()) {
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
            log.debug("Could not auto-resolve alerts for conflict {}: {}", conflictId, ex.getMessage());
        }
    }

    private String mapStrategyToCommandType(ResolutionStrategy strategy) {
        return switch (strategy) {
            case HOVER, HOLD -> "HOVER";
            case ALTITUDE_CHANGE, DIVERT_ALTITUDE -> "SET_ALTITUDE";
            case REROUTE -> "GOTO";
            case RETURN_TO_BASE -> "RTL";
            case SPEED_ADJUSTMENT, AUTO_CLEARED -> null;
        };
    }
}

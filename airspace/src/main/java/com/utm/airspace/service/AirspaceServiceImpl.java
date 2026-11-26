package com.utm.airspace.service;

import com.utm.airspace.mapper.AirspaceZoneMapper;
import com.utm.airspace.model.AirspaceZone;
import com.utm.airspace.model.enumeration.AirspaceZoneStatus;
import com.utm.airspace.model.enumeration.AirspaceZoneType;
import com.utm.airspace.repository.AirspaceZoneRepository;
import com.utm.airspace.service.client.HubClientService;
import com.utm.airspace.service.client.WeatherAisClientService;
import com.utm.airspace.viewmodel.check.AirspaceCheckPathResultVm;
import com.utm.airspace.viewmodel.check.AirspaceCheckPathVm;
import com.utm.airspace.viewmodel.check.AirspaceCheckPointVm;
import com.utm.airspace.viewmodel.check.AirspaceCheckResultVm;
import com.utm.airspace.viewmodel.check.AirspaceCheckVm;
import com.utm.airspace.viewmodel.check.AirspacePathConflictVm;
import com.utm.airspace.viewmodel.check.AirspaceViolationVm;
import com.utm.airspace.viewmodel.client.OpenaipFeedClientVm.OpenaipAirspaceItemVm;
import com.utm.airspace.viewmodel.zone.AirspaceZoneListVm;
import com.utm.airspace.viewmodel.zone.AirspaceZonePostVm;
import com.utm.airspace.viewmodel.zone.AirspaceZonePutVm;
import com.utm.airspace.viewmodel.zone.AirspaceZoneVm;
import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.commonlibrary.generator.BusinessCodeGenerator;
import com.utm.commonlibrary.generator.CodePatternRule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
public class AirspaceServiceImpl implements AirspaceService {

    private final AirspaceZoneRepository airspaceZoneRepository;
    private final AirspaceZoneMapper airspaceZoneMapper;
    private final SpatialCalculationService spatialCalculationService;
    private final HubClientService hubClientService;
    private final WeatherAisClientService weatherAisClientService;

    @Autowired
    public AirspaceServiceImpl(
            AirspaceZoneRepository airspaceZoneRepository,
            AirspaceZoneMapper airspaceZoneMapper,
            SpatialCalculationService spatialCalculationService,
            HubClientService hubClientService,
            @Autowired(required = false) WeatherAisClientService weatherAisClientService) {
        this.airspaceZoneRepository = airspaceZoneRepository;
        this.airspaceZoneMapper = airspaceZoneMapper;
        this.spatialCalculationService = spatialCalculationService;
        this.hubClientService = hubClientService;
        this.weatherAisClientService = weatherAisClientService;
    }

    @Override
    @Transactional(readOnly = true)
    public AirspaceCheckResultVm checkPoint(AirspaceCheckVm checkVm) {
        List<AirspaceZone> activeZones = new ArrayList<>(airspaceZoneRepository.findByStatus(AirspaceZoneStatus.ACTIVE));
        activeZones.sort(Comparator.comparingInt((AirspaceZone z) -> z.getPriority() != null ? z.getPriority() : 0).reversed());
        List<AirspaceZoneVm> activeZoneVms = airspaceZoneMapper.toVmList(activeZones);
        List<AirspaceViolationVm> violations = new ArrayList<>();
        boolean safe = true;

        ZonedDateTime now = ZonedDateTime.now();
        for (int i = 0; i < activeZones.size(); i++) {
            AirspaceZone zone = activeZones.get(i);
            if (!isZoneEffective(zone, now)) {
                continue;
            }
            AirspaceZoneVm zoneVm = activeZoneVms.get(i);
            boolean inside = spatialCalculationService.isPointInPolygon(
                    checkVm.lat(),
                    checkVm.lon(),
                    zoneVm.geometry());

            if (inside) {
                Double effectiveFloor = resolveEffectiveFloor(zone);
                Double effectiveCeiling = resolveEffectiveCeiling(zone);
                boolean belowFloor = effectiveFloor != null && effectiveFloor > 0.0
                        && checkVm.alt() != null && checkVm.alt() < effectiveFloor;
                boolean ruleProhibited = isRuleFlagTrue(zone.getRules(), "prohibited")
                        || isRuleFlagTrue(zone.getRules(), "noFly");
                boolean ruleRequiresAuth = isRuleFlagTrue(zone.getRules(), "authorizationRequired")
                        || isRuleFlagTrue(zone.getRules(), "requiresAuthorization");
                if (isForbiddenType(zone.getZoneType()) || ruleProhibited) {
                    if (!belowFloor) {
                        safe = false;
                        violations.add(new AirspaceViolationVm(
                                zone.getId(),
                                zone.getName(),
                                zone.getZoneType().getValue(),
                                effectiveFloor,
                                effectiveCeiling,
                                "local",
                                "critical",
                                "Point falls inside strictly forbidden airspace"));
                    }
                } else if (isRestrictedType(zone.getZoneType()) || ruleRequiresAuth) {
                    if (!belowFloor) {
                        safe = false;
                        violations.add(new AirspaceViolationVm(
                                zone.getId(),
                                zone.getName(),
                                zone.getZoneType().getValue(),
                                effectiveFloor,
                                effectiveCeiling,
                                "local",
                                "warning",
                                "Point falls inside restricted airspace requiring special ATC clearance"));
                    }
                } else if (checkVm.alt() != null && effectiveCeiling != null
                        && checkVm.alt() > effectiveCeiling) {
                    safe = false;
                    violations.add(new AirspaceViolationVm(
                            zone.getId(),
                            zone.getName(),
                            zone.getZoneType().getValue(),
                            effectiveFloor,
                            effectiveCeiling,
                            "local",
                            "warning",
                            String.format("Point altitude (%.1fm) exceeds ceiling limit (%.1fm) of zone '%s'",
                                    checkVm.alt(), effectiveCeiling, zone.getName())));
                } else if (belowFloor) {
                    safe = false;
                    violations.add(new AirspaceViolationVm(
                            zone.getId(),
                            zone.getName(),
                            zone.getZoneType().getValue(),
                            effectiveFloor,
                            effectiveCeiling,
                            "local",
                            "warning",
                            String.format("Point altitude (%.1fm) falls below floor limit (%.1fm) of zone '%s'",
                                    checkVm.alt(), effectiveFloor, zone.getName())));
                }
            }
        }

        for (OpenaipAirspaceItemVm ext : fetchExternalAirspacesSafe()) {
            if (ext.geometry() == null || "OTHER".equalsIgnoreCase(ext.type())) {
                continue;
            }
            double alt = checkVm.alt() != null ? checkVm.alt() : 0.0;
            double floor = ext.lowerLimitM() != null ? ext.lowerLimitM() : 0.0;
            double ceiling = ext.upperLimitM() != null ? ext.upperLimitM() : 9999.0;
            if (alt < floor || alt > ceiling) {
                continue;
            }
            if (spatialCalculationService.isPointInPolygon(checkVm.lat(), checkVm.lon(), ext.geometry())) {
                String sev = ext.severity() != null ? ext.severity() : "warning";
                if ("critical".equalsIgnoreCase(sev) || "warning".equalsIgnoreCase(sev)) {
                    safe = false;
                }
                violations.add(new AirspaceViolationVm(
                        ext.id(),
                        ext.name(),
                        ext.type() != null ? ext.type().toLowerCase() : "restricted",
                        floor,
                        ceiling,
                        "openaip",
                        sev,
                        String.format("Point intersects openAIP %s airspace '%s'", ext.type(), ext.name())));
            }
        }

        return new AirspaceCheckResultVm(safe, violations);
    }

    @Override
    @Transactional(readOnly = true)
    public AirspaceCheckPathResultVm checkPath(AirspaceCheckPathVm checkPathVm) {
        List<AirspaceZone> activeZones = new ArrayList<>(airspaceZoneRepository.findByStatus(AirspaceZoneStatus.ACTIVE));
        activeZones.sort(Comparator.comparingInt((AirspaceZone z) -> z.getPriority() != null ? z.getPriority() : 0).reversed());
        List<AirspaceZoneVm> activeZoneVms = airspaceZoneMapper.toVmList(activeZones);
        List<OpenaipAirspaceItemVm> externalZones = fetchExternalAirspacesSafe();
        List<AirspacePathConflictVm> violations = new ArrayList<>();
        ZonedDateTime now = ZonedDateTime.now();
        Set<String> reportedSegmentZonePairs = new HashSet<>();

        List<SpatialCalculationService.SampledPoint> sampledPoints = spatialCalculationService
                .samplePolyline(checkPathVm.points(), checkPathVm.spacingM());

        for (SpatialCalculationService.SampledPoint pt : sampledPoints) {
            for (int i = 0; i < activeZones.size(); i++) {
                AirspaceZone zone = activeZones.get(i);
                if (!isZoneEffective(zone, now)) {
                    continue;
                }
                AirspaceZoneVm zoneVm = activeZoneVms.get(i);
                boolean inside = spatialCalculationService.isPointInPolygon(
                        pt.lat(),
                        pt.lon(),
                        zoneVm.geometry());

                if (inside) {
                    Double effectiveFloor = resolveEffectiveFloor(zone);
                    Double effectiveCeiling = resolveEffectiveCeiling(zone);
                    boolean belowFloor = effectiveFloor != null && effectiveFloor > 0.0
                            && pt.alt() < effectiveFloor;
                    boolean ruleProhibited = isRuleFlagTrue(zone.getRules(), "prohibited")
                            || isRuleFlagTrue(zone.getRules(), "noFly");
                    boolean ruleRequiresAuth = isRuleFlagTrue(zone.getRules(), "authorizationRequired")
                            || isRuleFlagTrue(zone.getRules(), "requiresAuthorization");
                    if (isForbiddenType(zone.getZoneType()) || ruleProhibited) {
                        if (!belowFloor) {
                            reportedSegmentZonePairs.add(pt.segmentIndex() + ":" + zone.getId());
                            violations.add(new AirspacePathConflictVm(
                                    zone.getId(),
                                    zone.getName(),
                                    zone.getZoneType().getValue(),
                                    effectiveFloor,
                                    effectiveCeiling,
                                    "local",
                                    "critical",
                                    new AirspaceCheckPointVm(pt.lat(), pt.lon(), pt.alt()),
                                    pt.segmentIndex(),
                                    Math.round(pt.distanceFromStartM() * 100.0) / 100.0,
                                    String.format("Trajectory intersects strictly forbidden airspace '%s'",
                                            zone.getName())));
                        }
                    } else if (isRestrictedType(zone.getZoneType()) || ruleRequiresAuth) {
                        if (!belowFloor) {
                            reportedSegmentZonePairs.add(pt.segmentIndex() + ":" + zone.getId());
                            violations.add(new AirspacePathConflictVm(
                                    zone.getId(),
                                    zone.getName(),
                                    zone.getZoneType().getValue(),
                                    effectiveFloor,
                                    effectiveCeiling,
                                    "local",
                                    "warning",
                                    new AirspaceCheckPointVm(pt.lat(), pt.lon(), pt.alt()),
                                    pt.segmentIndex(),
                                    Math.round(pt.distanceFromStartM() * 100.0) / 100.0,
                                    String.format("Trajectory intersects restricted zone '%s'", zone.getName())));
                        }
                    } else if (effectiveCeiling != null && pt.alt() > effectiveCeiling) {
                        reportedSegmentZonePairs.add(pt.segmentIndex() + ":" + zone.getId());
                        violations.add(new AirspacePathConflictVm(
                                zone.getId(),
                                zone.getName(),
                                zone.getZoneType().getValue(),
                                effectiveFloor,
                                effectiveCeiling,
                                "local",
                                "warning",
                                new AirspaceCheckPointVm(pt.lat(), pt.lon(), pt.alt()),
                                pt.segmentIndex(),
                                Math.round(pt.distanceFromStartM() * 100.0) / 100.0,
                                String.format("Trajectory altitude (%.1fm) exceeds ceiling limit (%.1fm) in zone '%s'",
                                        pt.alt(), effectiveCeiling, zone.getName())));
                    } else if (belowFloor) {
                        reportedSegmentZonePairs.add(pt.segmentIndex() + ":" + zone.getId());
                        violations.add(new AirspacePathConflictVm(
                                zone.getId(),
                                zone.getName(),
                                zone.getZoneType().getValue(),
                                effectiveFloor,
                                effectiveCeiling,
                                "local",
                                "warning",
                                new AirspaceCheckPointVm(pt.lat(), pt.lon(), pt.alt()),
                                pt.segmentIndex(),
                                Math.round(pt.distanceFromStartM() * 100.0) / 100.0,
                                String.format(
                                        "Trajectory altitude (%.1fm) falls below floor limit (%.1fm) in zone '%s'",
                                        pt.alt(), effectiveFloor, zone.getName())));
                    }
                }
            }

            for (OpenaipAirspaceItemVm ext : externalZones) {
                if (ext.geometry() == null || "OTHER".equalsIgnoreCase(ext.type())) {
                    continue;
                }
                String pairKey = pt.segmentIndex() + ":openaip:" + ext.id();
                if (reportedSegmentZonePairs.contains(pairKey)) {
                    continue;
                }
                double floor = ext.lowerLimitM() != null ? ext.lowerLimitM() : 0.0;
                double ceiling = ext.upperLimitM() != null ? ext.upperLimitM() : 9999.0;
                if (pt.alt() < floor || pt.alt() > ceiling) {
                    continue;
                }
                if (spatialCalculationService.isPointInPolygon(pt.lat(), pt.lon(), ext.geometry())) {
                    reportedSegmentZonePairs.add(pairKey);
                    violations.add(new AirspacePathConflictVm(
                            ext.id(),
                            ext.name(),
                            ext.type() != null ? ext.type().toLowerCase() : "restricted",
                            floor,
                            ceiling,
                            "openaip",
                            ext.severity() != null ? ext.severity() : "warning",
                            new AirspaceCheckPointVm(pt.lat(), pt.lon(), pt.alt()),
                            pt.segmentIndex(),
                            Math.round(pt.distanceFromStartM() * 100.0) / 100.0,
                            String.format("Trajectory intersects openAIP %s airspace '%s'", ext.type(), ext.name())));
                }
            }
        }

        List<AirspaceCheckPointVm> rawPoints = checkPathVm.points();
        if (rawPoints != null && rawPoints.size() >= 2) {
            double cumulativeDistance = 0.0;
            for (int seg = 0; seg < rawPoints.size() - 1; seg++) {
                AirspaceCheckPointVm p1 = rawPoints.get(seg);
                AirspaceCheckPointVm p2 = rawPoints.get(seg + 1);
                double segLen = spatialCalculationService.calculateDistanceMeters(p1.lat(), p1.lon(), p2.lat(),
                        p2.lon());
                double midLat = (p1.lat() + p2.lat()) / 2.0;
                double midLon = (p1.lon() + p2.lon()) / 2.0;
                double midAlt = (p1.alt() + p2.alt()) / 2.0;

                for (int i = 0; i < activeZones.size(); i++) {
                    AirspaceZone zone = activeZones.get(i);
                    if (!isZoneEffective(zone, now)) {
                        continue;
                    }
                    if (!isForbiddenType(zone.getZoneType()) && !isRestrictedType(zone.getZoneType())) {
                        continue;
                    }
                    if (reportedSegmentZonePairs.contains(seg + ":" + zone.getId())) {
                        continue;
                    }
                    boolean belowFloor = zone.getAltitudeFloor() != null && zone.getAltitudeFloor() > 0.0
                            && Math.max(p1.alt(), p2.alt()) < zone.getAltitudeFloor();
                    if (belowFloor) {
                        continue;
                    }
                    AirspaceZoneVm zoneVm = activeZoneVms.get(i);
                    if (spatialCalculationService.doesSegmentIntersectPolygon(
                            p1.lat(), p1.lon(), p2.lat(), p2.lon(), zoneVm.geometry())) {
                        reportedSegmentZonePairs.add(seg + ":" + zone.getId());
                        boolean forbidden = isForbiddenType(zone.getZoneType());
                        String reason = forbidden
                                ? String.format("Trajectory segment intersects strictly forbidden airspace '%s'",
                                        zone.getName())
                                : String.format("Trajectory segment intersects restricted zone '%s'", zone.getName());
                        violations.add(new AirspacePathConflictVm(
                                zone.getId(),
                                zone.getName(),
                                zone.getZoneType().getValue(),
                                zone.getAltitudeFloor(),
                                zone.getAltitudeCeiling(),
                                "local",
                                forbidden ? "critical" : "warning",
                                new AirspaceCheckPointVm(midLat, midLon, midAlt),
                                seg,
                                Math.round((cumulativeDistance + segLen / 2.0) * 100.0) / 100.0,
                                reason));
                    }
                }
                cumulativeDistance += segLen;
            }
        }

        boolean safe = violations.stream().noneMatch(v -> "critical".equalsIgnoreCase(v.severity()) || "warning".equalsIgnoreCase(v.severity()));
        return new AirspaceCheckPathResultVm(safe, violations);
    }

    private List<OpenaipAirspaceItemVm> fetchExternalAirspacesSafe() {
        if (weatherAisClientService == null) {
            return List.of();
        }
        List<OpenaipAirspaceItemVm> list = weatherAisClientService.getOpenaipAirspaces();
        return list != null ? list : List.of();
    }

    private static boolean isForbiddenType(AirspaceZoneType type) {
        return type == AirspaceZoneType.NO_FLY_ZONE
                || type == AirspaceZoneType.PROHIBITED
                || type == AirspaceZoneType.EMERGENCY_EXCLUSION;
    }

    private static boolean isRestrictedType(AirspaceZoneType type) {
        return type == AirspaceZoneType.RESTRICTED
                || type == AirspaceZoneType.TEMPORARY_RESTRICTION;
    }

    boolean isZoneEffective(AirspaceZone zone, ZonedDateTime now) {
        if (zone.getEffectiveStart() != null && now.isBefore(zone.getEffectiveStart())) {
            return false;
        }
        if (zone.getEffectiveEnd() != null && now.isAfter(zone.getEffectiveEnd())) {
            return false;
        }
        return isWithinSchedule(zone.getSchedule(), now);
    }

    private static boolean isWithinSchedule(Map<String, Object> schedule, ZonedDateTime now) {
        if (schedule == null || schedule.isEmpty()) {
            return true;
        }
        if (Boolean.FALSE.equals(schedule.get("enabled")) || Boolean.FALSE.equals(schedule.get("active"))) {
            return false;
        }
        ZonedDateTime zonedNow = now;
        Object tzObj = schedule.get("timezone");
        if (tzObj instanceof String tz && !tz.isBlank()) {
            try {
                zonedNow = now.withZoneSameInstant(ZoneId.of(tz.trim()));
            } catch (Exception ignored) {
            }
        }

        Object daysObj = schedule.get("daysOfWeek");
        if (daysObj == null) {
            daysObj = schedule.get("days");
        }
        if (daysObj instanceof Collection<?> days && !days.isEmpty()) {
            DayOfWeek today = zonedNow.getDayOfWeek();
            boolean dayMatched = false;
            for (Object d : days) {
                if (matchesDay(d, today)) {
                    dayMatched = true;
                    break;
                }
            }
            if (!dayMatched) {
                return false;
            }
        }

        LocalTime startTime = parseLocalTime(schedule.get("startTime"));
        LocalTime endTime = parseLocalTime(schedule.get("endTime"));
        if (startTime != null && endTime != null) {
            LocalTime currentTime = zonedNow.toLocalTime();
            if (!startTime.isAfter(endTime)) {
                return !currentTime.isBefore(startTime) && !currentTime.isAfter(endTime);
            }
            return !currentTime.isBefore(startTime) || !currentTime.isAfter(endTime);
        }
        return true;
    }

    private static boolean matchesDay(Object token, DayOfWeek today) {
        if (token instanceof Number num) {
            int n = num.intValue();
            int isoDay = today.getValue(); // 1=Mon..7=Sun
            int jsDay = isoDay % 7;        // 0=Sun, 1=Mon..6=Sat
            return n == isoDay || n == jsDay;
        }
        if (token instanceof String raw && !raw.isBlank()) {
            String s = raw.trim().toUpperCase(Locale.ROOT);
            String full = today.name();
            return s.equals(full) || full.startsWith(s);
        }
        return false;
    }

    private static LocalTime parseLocalTime(Object raw) {
        if (raw instanceof String s && !s.isBlank()) {
            try {
                return LocalTime.parse(s.trim());
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    private static Double resolveEffectiveCeiling(AirspaceZone zone) {
        Double base = zone.getAltitudeCeiling();
        Double ruleMax = extractNumericRule(zone.getRules(), "maxAltitude", "maxAltitudeM");
        if (ruleMax == null) {
            return base;
        }
        return base == null ? ruleMax : Math.min(base, ruleMax);
    }

    private static Double resolveEffectiveFloor(AirspaceZone zone) {
        Double base = zone.getAltitudeFloor();
        Double ruleMin = extractNumericRule(zone.getRules(), "minAltitude", "minAltitudeM");
        if (ruleMin == null) {
            return base;
        }
        return base == null ? ruleMin : Math.max(base, ruleMin);
    }

    private static Double extractNumericRule(Map<String, Object> rules, String... keys) {
        if (rules == null || rules.isEmpty()) {
            return null;
        }
        for (String key : keys) {
            Object val = rules.get(key);
            if (val instanceof Number n) {
                return n.doubleValue();
            }
            if (val instanceof String s && !s.isBlank()) {
                try {
                    return Double.parseDouble(s.trim());
                } catch (NumberFormatException ignored) {
                }
            }
        }
        return null;
    }

    private static boolean isRuleFlagTrue(Map<String, Object> rules, String key) {
        if (rules == null || rules.isEmpty()) {
            return false;
        }
        Object val = rules.get(key);
        if (val instanceof Boolean b) {
            return b;
        }
        return val instanceof String s && "true".equalsIgnoreCase(s.trim());
    }

    @Override
    @Transactional(readOnly = true)
    public AirspaceZoneListVm getAllZones(String hubId, String zoneType, String status, int limit, int offset) {
        var spec = AirspaceZoneRepository.filterBy(hubId, zoneType, status);

        if (limit <= 0) {
            List<AirspaceZone> all = airspaceZoneRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdOn"));
            List<AirspaceZoneVm> items = airspaceZoneMapper.toVmList(all);
            return AirspaceZoneListVm.of(items, items.size());
        }

        int pageSize = limit;
        int pageNumber = Math.max(0, offset) / pageSize;
        Pageable pageable = PageRequest.of(pageNumber, pageSize, Sort.by(Sort.Direction.DESC, "createdOn"));

        Page<AirspaceZone> page = airspaceZoneRepository.findAll(spec, pageable);
        List<AirspaceZoneVm> items = airspaceZoneMapper.toVmList(page.getContent());

        return AirspaceZoneListVm.of(items, page.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public AirspaceZoneVm getZoneById(String id) {
        AirspaceZone zone = airspaceZoneRepository.findById(id)
                .or(() -> airspaceZoneRepository.findByCode(id.trim().toUpperCase()))
                .orElseThrow(() -> new NotFoundException(MessageCode.AIRSPACE_ZONE_NOT_FOUND, "id", id));
        return airspaceZoneMapper.toVm(zone);
    }

    @Override
    @Transactional
    public AirspaceZoneVm createZone(AirspaceZonePostVm postVm) {
        String trimmedName = postVm.name().trim();
        if (airspaceZoneRepository.existsByName(trimmedName)) {
            throw new DuplicatedException(MessageCode.AIRSPACE_ZONE_NAME_ALREADY_EXISTED, "name", trimmedName);
        }

        String code;
        if (postVm.code() != null && !postVm.code().isBlank()) {
            code = postVm.code().trim().toUpperCase();
            if (airspaceZoneRepository.existsByCode(code)) {
                throw new DuplicatedException(MessageCode.AIRSPACE_ZONE_CODE_ALREADY_EXISTED, "code", code);
            }
        } else {
            code = BusinessCodeGenerator.generateUnique(CodePatternRule.AIRSPACE_ZONE,
                    airspaceZoneRepository::existsByCode);
        }

        if (postVm.hubId() != null && !postVm.hubId().isBlank()) {
            if (!hubClientService.existsById(postVm.hubId().trim())) {
                throw new NotFoundException(MessageCode.HUB_NOT_FOUND, "id", postVm.hubId().trim());
            }
        }

        validateAltitudeBounds(postVm.altitudeFloor(), postVm.altitudeCeiling());
        validateEffectiveWindow(postVm.effectiveStart(), postVm.effectiveEnd());
        spatialCalculationService.validatePolygon(postVm.geometry());

        AirspaceZone zone = airspaceZoneMapper.toEntity(postVm);
        zone.setName(trimmedName);
        zone.setCode(code);
        if (zone.getHubId() != null && zone.getHubId().isBlank()) {
            zone.setHubId(null);
        }
        AirspaceZone saved = airspaceZoneRepository.saveAndFlush(zone);
        log.info("Created new AirspaceZone with ID: {}, code: {} and name: {}", saved.getId(), saved.getCode(),
                saved.getName());
        return airspaceZoneMapper.toVm(saved);
    }

    @Override
    @Transactional
    public AirspaceZoneVm updateZone(String id, AirspaceZonePutVm putVm) {
        AirspaceZone zone = airspaceZoneRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.AIRSPACE_ZONE_NOT_FOUND, "id", id));

        if (putVm.name() != null) {
            String trimmedName = putVm.name().trim();
            if (airspaceZoneRepository.existsByNameAndIdNot(trimmedName, id)) {
                throw new DuplicatedException(MessageCode.AIRSPACE_ZONE_NAME_ALREADY_EXISTED, "name", trimmedName);
            }
        }

        if (putVm.hubId() != null && !putVm.hubId().isBlank()) {
            if (!hubClientService.existsById(putVm.hubId().trim())) {
                throw new NotFoundException(MessageCode.HUB_NOT_FOUND, "id", putVm.hubId().trim());
            }
        }

        Double effectiveFloor = putVm.altitudeFloor() != null ? putVm.altitudeFloor() : zone.getAltitudeFloor();
        Double effectiveCeiling = putVm.altitudeCeiling() != null ? putVm.altitudeCeiling() : zone.getAltitudeCeiling();
        validateAltitudeBounds(effectiveFloor, effectiveCeiling);

        ZonedDateTime effectiveStart = putVm.effectiveStart() != null ? putVm.effectiveStart() : zone.getEffectiveStart();
        ZonedDateTime effectiveEnd = putVm.effectiveEnd() != null ? putVm.effectiveEnd() : zone.getEffectiveEnd();
        validateEffectiveWindow(effectiveStart, effectiveEnd);

        if (putVm.geometry() != null) {
            spatialCalculationService.validatePolygon(putVm.geometry());
        }

        airspaceZoneMapper.updateEntityFromPutVm(putVm, zone);
        if (putVm.name() != null) {
            zone.setName(putVm.name().trim());
        }
        if (putVm.hubId() != null && putVm.hubId().isBlank()) {
            zone.setHubId(null);
        }
        AirspaceZone updated = airspaceZoneRepository.saveAndFlush(zone);
        log.info("Updated AirspaceZone with ID: {}", updated.getId());
        return airspaceZoneMapper.toVm(updated);
    }

    @Override
    @Transactional
    public void deleteZone(String id) {
        AirspaceZone zone = airspaceZoneRepository.findById(id)
                .orElseThrow(() -> new NotFoundException(MessageCode.AIRSPACE_ZONE_NOT_FOUND, "id", id));
        zone.setStatus(AirspaceZoneStatus.INACTIVE);
        airspaceZoneRepository.save(zone);
        log.info("Soft deleted (deactivated) AirspaceZone with ID: {}", id);
    }

    private void validateAltitudeBounds(Double floor, Double ceiling) {
        double effectiveFloor = floor != null ? floor : 0.0;
        double effectiveCeiling = ceiling != null ? ceiling : 120.0;
        if (effectiveFloor >= effectiveCeiling) {
            throw new BadRequestException(MessageCode.INVALID_AIRSPACE_BOUNDS);
        }
    }

    private void validateEffectiveWindow(ZonedDateTime start, ZonedDateTime end) {
        if (start != null && end != null && !start.isBefore(end)) {
            throw new BadRequestException(MessageCode.INVALID_EFFECTIVE_WINDOW);
        }
    }
}

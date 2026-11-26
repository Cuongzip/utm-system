package com.utm.mission.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.commonlibrary.generator.BusinessCodeGenerator;
import com.utm.commonlibrary.generator.CodePatternRule;
import com.utm.mission.mapper.MissionTemplateMapper;
import com.utm.mission.model.Mission;
import com.utm.mission.model.MissionTemplate;
import com.utm.mission.model.Waypoint;
import com.utm.mission.model.enumeration.MissionScheduleType;
import com.utm.mission.model.enumeration.MissionStatus;
import com.utm.mission.model.enumeration.StopoverType;
import com.utm.mission.model.enumeration.WaypointType;
import com.utm.mission.repository.MissionRepository;
import com.utm.mission.repository.MissionTemplateRepository;
import com.utm.mission.repository.WaypointRepository;
import com.utm.mission.service.client.HubClientService;
import com.utm.mission.util.GeoUtils;
import com.utm.mission.util.MissionLegUtils;
import com.utm.mission.viewmodel.client.HubBriefVm;
import com.utm.mission.viewmodel.mission.MissionVm;
import com.utm.mission.viewmodel.template.MissionBlueprintVm;
import com.utm.mission.viewmodel.template.MissionTemplateInstantiatePostVm;
import com.utm.mission.viewmodel.template.MissionTemplateListVm;
import com.utm.mission.viewmodel.template.MissionTemplatePostVm;
import com.utm.mission.viewmodel.template.MissionTemplatePutVm;
import com.utm.mission.viewmodel.template.MissionTemplateVm;
import com.utm.mission.viewmodel.template.TemplateVariableVm;
import com.utm.mission.viewmodel.template.WaypointBlueprintVm;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class MissionTemplateServiceImpl implements MissionTemplateService {

    private static final Pattern PLACEHOLDER_PATTERN = Pattern.compile("\\$\\{([^}]+)}|\\{\\{([^}]+)}}");

    private final MissionTemplateRepository templateRepository;
    private final MissionRepository missionRepository;
    private final WaypointRepository waypointRepository;
    private final MissionTemplateMapper templateMapper;
    private final MissionService missionService;
    private final HubClientService hubClientService;

    @Override
    @Transactional
    public MissionTemplateVm createTemplate(MissionTemplatePostVm postVm) {
        String code;
        if (postVm.code() == null || postVm.code().isBlank()) {
            code = BusinessCodeGenerator.generateUnique(
                    CodePatternRule.MISSION_CODE.withPrefix("TPL"),
                    templateRepository::existsByCode);
        } else {
            code = postVm.code().trim().toUpperCase(Locale.ROOT);
            if (templateRepository.existsByCode(code)) {
                throw new DuplicatedException(MessageCode.TEMPLATE_CODE_ALREADY_EXISTED, "code", code);
            }
        }

        MissionTemplate entity = templateMapper.toEntity(postVm);
        entity.setCode(code);
        entity.setName(postVm.name().trim());
        if (postVm.description() != null) {
            entity.setDescription(postVm.description().trim());
        }
        if (postVm.category() != null && !postVm.category().isBlank()) {
            entity.setCategory(postVm.category().trim().toLowerCase(Locale.ROOT));
        }
        entity.setVersion(1);
        entity.setIsLatest(true);
        entity.setUsageCount(0);
        entity.setIsPublished(false);

        MissionTemplate saved = templateRepository.save(entity);
        return templateMapper.toVm(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public MissionTemplateListVm getTemplates(String category, Boolean published, String search,
            Integer limit, Integer offset) {
        Specification<MissionTemplate> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isTrue(root.get("isLatest")));

            if (category != null && !category.isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("category")), category.trim().toLowerCase(Locale.ROOT)));
            }
            if (published != null) {
                predicates.add(cb.equal(root.get("isPublished"), published));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("description"), "")), pattern),
                        cb.like(cb.lower(root.get("code")), pattern)));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        if (limit != null && limit <= 0) {
            List<MissionTemplate> all = templateRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdOn"));
            return MissionTemplateListVm.of(templateMapper.toVmList(all), all.size());
        }

        int pageSize = (limit != null && limit > 0) ? limit : 20;
        int pageOffset = offset != null ? Math.max(0, offset) : 0;
        Pageable pageable = PageRequest.of(pageOffset / pageSize, pageSize, Sort.by(Sort.Direction.DESC, "createdOn"));
        Page<MissionTemplate> page = templateRepository.findAll(spec, pageable);
        return MissionTemplateListVm.of(templateMapper.toVmList(page.getContent()), page.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public MissionTemplateVm getTemplateById(String id) {
        return templateMapper.toVm(findLatestTemplateOrThrow(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<MissionTemplateVm> getTemplateVersions(String id) {
        MissionTemplate latest = findLatestTemplateOrThrow(id);
        List<MissionTemplate> versions = templateRepository.findByCodeOrderByVersionDesc(latest.getCode());
        return templateMapper.toVmList(versions);
    }

    @Override
    @Transactional(readOnly = true)
    public MissionTemplateVm getTemplateVersion(String id, int version) {
        MissionTemplate latest = findLatestTemplateOrThrow(id);
        MissionTemplate target = templateRepository.findByCodeAndVersion(latest.getCode(), version)
                .orElseThrow(() -> new NotFoundException(MessageCode.TEMPLATE_VERSION_NOT_FOUND, "version", version));
        return templateMapper.toVm(target);
    }

    @Override
    @Transactional
    public MissionTemplateVm updateTemplate(String id, MissionTemplatePutVm putVm) {
        MissionTemplate existing = findLatestTemplateOrThrow(id);
        existing.setIsLatest(false);
        templateRepository.saveAndFlush(existing);

        MissionTemplate nextVersion = new MissionTemplate();
        nextVersion.setCode(existing.getCode());
        nextVersion.setName(putVm.name() != null && !putVm.name().isBlank() ? putVm.name().trim() : existing.getName());
        nextVersion.setDescription(putVm.description() != null ? putVm.description().trim() : existing.getDescription());
        nextVersion.setCategory(putVm.category() != null && !putVm.category().isBlank()
                ? putVm.category().trim().toLowerCase(Locale.ROOT)
                : existing.getCategory());
        nextVersion.setTags(putVm.tags() != null ? putVm.tags() : existing.getTags());
        nextVersion.setVariables(putVm.variables() != null ? putVm.variables() : existing.getVariables());
        nextVersion.setBlueprint(putVm.blueprint() != null ? putVm.blueprint() : existing.getBlueprint());
        nextVersion.setVersion(existing.getVersion() + 1);
        nextVersion.setIsLatest(true);
        nextVersion.setPreviousVersionId(existing.getId());
        nextVersion.setChangelog(putVm.changelog());
        nextVersion.setUsageCount(existing.getUsageCount());
        nextVersion.setIsPublished(existing.getIsPublished());
        nextVersion.setPublishedAt(existing.getPublishedAt());

        MissionTemplate saved = templateRepository.save(nextVersion);
        return templateMapper.toVm(saved);
    }

    @Override
    @Transactional
    public MissionTemplateVm publishTemplate(String id) {
        MissionTemplate template = findLatestTemplateOrThrow(id);
        template.setIsPublished(true);
        template.setPublishedAt(ZonedDateTime.now());
        return templateMapper.toVm(templateRepository.save(template));
    }

    @Override
    @Transactional
    public MissionTemplateVm unpublishTemplate(String id) {
        MissionTemplate template = findLatestTemplateOrThrow(id);
        template.setIsPublished(false);
        template.setPublishedAt(null);
        return templateMapper.toVm(templateRepository.save(template));
    }

    @Override
    @Transactional
    public void deleteTemplate(String id) {
        MissionTemplate latest = findLatestTemplateOrThrow(id);
        List<MissionTemplate> allVersions = templateRepository.findByCodeOrderByVersionDesc(latest.getCode());
        boolean anyUsed = (latest.getUsageCount() != null && latest.getUsageCount() > 0)
                || allVersions.stream().anyMatch(v -> v.getUsageCount() != null && v.getUsageCount() > 0);
        if (anyUsed) {
            throw new BadRequestException(MessageCode.TEMPLATE_IN_USE_CANNOT_DELETE);
        }
        templateRepository.deleteAll(allVersions);
    }

    @Override
    @Transactional
    public MissionVm instantiateTemplate(String id, MissionTemplateInstantiatePostVm postVm) {
        MissionTemplate template = findLatestTemplateOrThrow(id);
        Map<String, Object> values = new HashMap<>();
        if (template.getVariables() != null) {
            for (TemplateVariableVm variable : template.getVariables()) {
                if (variable.defaultValue() != null) {
                    values.put(variable.key(), variable.defaultValue());
                }
            }
        }
        if (postVm != null && postVm.variableValues() != null) {
            values.putAll(postVm.variableValues());
        }

        if (template.getVariables() != null) {
            for (TemplateVariableVm variable : template.getVariables()) {
                Object val = values.get(variable.key());
                if (variable.required() && (val == null || (val instanceof String s && s.isBlank()))) {
                    throw new BadRequestException(MessageCode.TEMPLATE_VARIABLE_MISSING,
                            "Required template variable missing: " + variable.key());
                }
            }
        }

        MissionBlueprintVm blueprint = template.getBlueprint();
        List<Waypoint> resolvedWaypoints = resolveWaypoints(blueprint, values);

        String departureHubId = resolveHubId(
                postVm != null ? postVm.departureHubId() : null,
                values.get("departure_hub"),
                resolvedWaypoints.isEmpty() ? null : resolvedWaypoints.get(0));
        if (departureHubId == null) {
            throw new BadRequestException(MessageCode.DEPARTURE_HUB_NOT_FOUND,
                    "Could not determine departure hub for template instantiation");
        }

        String arrivalHubId = resolveHubId(
                postVm != null ? postVm.arrivalHubId() : null,
                values.get("arrival_hub"),
                resolvedWaypoints.isEmpty() ? null : resolvedWaypoints.get(resolvedWaypoints.size() - 1));
        if (arrivalHubId == null) {
            arrivalHubId = departureHubId;
        }
        final String resolvedArrivalHubId = arrivalHubId;

        HubBriefVm depHub = hubClientService.getHubById(departureHubId)
                .orElseThrow(() -> new NotFoundException(MessageCode.DEPARTURE_HUB_NOT_FOUND, "id", departureHubId));
        HubBriefVm arrHub = hubClientService.getHubById(resolvedArrivalHubId)
                .orElseThrow(() -> new NotFoundException(MessageCode.ARRIVAL_HUB_NOT_FOUND, "id", resolvedArrivalHubId));

        Mission mission = new Mission();
        mission.setCode(BusinessCodeGenerator.generateUnique(
                CodePatternRule.MISSION_CODE,
                missionRepository::existsByCode));
        String missionName = (postVm != null && postVm.missionName() != null && !postVm.missionName().isBlank())
                ? interpolateText(postVm.missionName().trim(), values)
                : interpolateText(template.getName(), values) + " - " + LocalDate.now();
        mission.setName(missionName);
        mission.setDescription(interpolateText(template.getDescription(), values));
        mission.setPayloadWeightKg(blueprint != null && blueprint.payloadWeightKg() != null
                ? blueprint.payloadWeightKg()
                : 0.0);
        mission.setDepartureHubId(departureHubId);
        mission.setArrivalHubId(arrivalHubId);
        mission.setDroneId(postVm != null && postVm.droneId() != null && !postVm.droneId().isBlank()
                ? postVm.droneId().trim()
                : asString(values.get("drone_id")));
        mission.setPilotId(postVm != null && postVm.pilotId() != null && !postVm.pilotId().isBlank()
                ? postVm.pilotId().trim()
                : null);

        MissionScheduleType scheduleType = (postVm != null && postVm.scheduleType() != null)
                ? postVm.scheduleType()
                : (blueprint != null && blueprint.defaultScheduleType() != null
                        ? blueprint.defaultScheduleType()
                        : MissionScheduleType.IMMEDIATE);
        mission.setScheduleType(scheduleType);
        mission.setScheduledAt(postVm != null ? postVm.scheduledAt() : null);
        mission.setTriggerConditions(blueprint != null ? blueprint.defaultTriggerConditions() : null);
        mission.setRequiredCapabilities(blueprint != null ? blueprint.requiredCapabilities() : null);
        mission.setTemplateId(template.getId());
        mission.setTemplateVersion(template.getVersion());
        mission.setStatus(MissionStatus.DRAFT);

        double dist = MissionLegUtils.calculateAnchoredDistance(resolvedWaypoints, depHub, arrHub);
        if (dist <= 0 && blueprint != null && blueprint.estimatedDistance() != null) {
            dist = blueprint.estimatedDistance();
        }
        int dur = MissionServiceImpl.calculateEstimatedDuration(resolvedWaypoints, dist);
        if (dur <= 0 && blueprint != null && blueprint.estimatedDuration() != null) {
            dur = blueprint.estimatedDuration();
        }
        mission.setEstimatedDistance(dist);
        mission.setEstimatedDuration(dur);

        Mission savedMission = missionRepository.save(mission);
        List<Waypoint> finalWaypoints = new ArrayList<>();
        boolean hasDepTerminal = !resolvedWaypoints.isEmpty()
                && resolvedWaypoints.getFirst().getWaypointType() == WaypointType.HUB
                && departureHubId.equals(resolvedWaypoints.getFirst().getHubId())
                && (resolvedWaypoints.getFirst().getStopoverType() == null
                        || resolvedWaypoints.getFirst().getStopoverType() == StopoverType.NONE);
        boolean hasArrTerminal = resolvedWaypoints.size() >= 2
                && resolvedWaypoints.getLast().getWaypointType() == WaypointType.HUB
                && resolvedArrivalHubId.equals(resolvedWaypoints.getLast().getHubId())
                && (resolvedWaypoints.getLast().getStopoverType() == null
                        || resolvedWaypoints.getLast().getStopoverType() == StopoverType.NONE);

        if (!hasDepTerminal && depHub.latitude() != null && depHub.longitude() != null) {
            finalWaypoints.add(MissionServiceImpl.buildTerminalHubWaypoint(savedMission, depHub, 1, true));
        }
        finalWaypoints.addAll(resolvedWaypoints);
        if (!hasArrTerminal && arrHub.latitude() != null && arrHub.longitude() != null) {
            finalWaypoints.add(MissionServiceImpl.buildTerminalHubWaypoint(savedMission, arrHub, finalWaypoints.size() + 1, false));
        }

        int seq = 1;
        for (Waypoint wp : finalWaypoints) {
            wp.setMission(savedMission);
            wp.setSequence(seq++);
            waypointRepository.save(wp);
        }

        template.setUsageCount((template.getUsageCount() != null ? template.getUsageCount() : 0) + 1);
        templateRepository.save(template);

        return missionService.getMissionById(savedMission.getId());
    }

    private MissionTemplate findLatestTemplateOrThrow(String idOrCode) {
        Optional<MissionTemplate> directLatest = templateRepository.findByIdAndIsLatestTrue(idOrCode);
        if (directLatest.isPresent()) {
            return directLatest.get();
        }
        Optional<MissionTemplate> anyById = templateRepository.findById(idOrCode);
        if (anyById.isPresent()) {
            return templateRepository.findByCodeAndIsLatestTrue(anyById.get().getCode())
                    .orElse(anyById.get());
        }
        return templateRepository.findByCodeAndIsLatestTrue(idOrCode.toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new NotFoundException(MessageCode.TEMPLATE_NOT_FOUND, "id", idOrCode));
    }

    private List<Waypoint> resolveWaypoints(MissionBlueprintVm blueprint, Map<String, Object> values) {
        List<Waypoint> result = new ArrayList<>();
        if (blueprint == null || blueprint.waypoints() == null) {
            return result;
        }
        int index = 1;
        for (WaypointBlueprintVm bp : blueprint.waypoints()) {
            String resolvedHubId = bp.hubId() != null ? interpolateText(bp.hubId(), values) : null;
            if (resolvedHubId != null && resolvedHubId.isBlank()) {
                resolvedHubId = null;
            }
            WaypointType wpType = bp.waypointType() != null
                    ? bp.waypointType()
                    : (resolvedHubId != null ? WaypointType.HUB : WaypointType.COORDINATE);

            double[] coords;
            if (wpType == WaypointType.HUB && resolvedHubId != null) {
                Optional<HubBriefVm> hubOpt = hubClientService.getHubById(resolvedHubId.trim());
                if (hubOpt.isPresent() && hubOpt.get().latitude() != null && hubOpt.get().longitude() != null) {
                    coords = new double[] { hubOpt.get().latitude(), hubOpt.get().longitude() };
                } else {
                    coords = resolveLatLon(bp.latitude(), bp.longitude(), values);
                }
            } else {
                coords = resolveLatLon(bp.latitude(), bp.longitude(), values);
            }

            Double altitude = resolveDouble(bp.altitude(), values, wpType == WaypointType.HUB ? 0.0 : 50.0);
            Double speed = resolveDouble(bp.speedToWaypoint(), values, null);

            Waypoint wp = new Waypoint();
            wp.setSequence(bp.sequence() != null ? bp.sequence() : index);
            wp.setName(bp.name() != null ? interpolateText(bp.name(), values) : "Waypoint " + index);
            wp.setWaypointType(wpType);
            wp.setLatitude(coords[0]);
            wp.setLongitude(coords[1]);
            wp.setAltitude(wpType == WaypointType.HUB
                    ? (altitude != null && altitude >= 0.0 ? altitude : 0.0)
                    : (altitude != null && altitude > 0.0 ? altitude : 50.0));
            wp.setSpeedToWaypoint(speed);
            wp.setHeadingAtWaypoint(bp.headingAtWaypoint());
            wp.setTurnRadius(bp.turnRadius());
            wp.setHubId(wpType == WaypointType.HUB ? resolvedHubId : null);
            StopoverType resolvedStopover = wpType == WaypointType.HUB
                    ? (bp.stopoverType() != null && bp.stopoverType() != StopoverType.NONE
                            ? bp.stopoverType()
                            : StopoverType.RECHARGE)
                    : StopoverType.NONE;
            wp.setStopoverType(resolvedStopover);
            wp.setGroundTimeMinutes(wpType == WaypointType.HUB
                    ? (bp.groundTimeMinutes() != null ? bp.groundTimeMinutes() : resolvedStopover.getDefaultGroundTimeMinutes())
                    : null);
            wp.setPayloadDeltaKg(bp.payloadDeltaKg() != null ? bp.payloadDeltaKg() : 0.0);
            wp.setHoverDurationSec(bp.hoverDuration() != null ? bp.hoverDuration() : 0);
            wp.setWaitForConfirmation(Boolean.TRUE.equals(bp.waitForConfirmation()));
            wp.setActions(bp.actions() != null ? new HashMap<>(bp.actions()) : null);
            wp.setConditions(bp.conditions() != null ? new HashMap<>(bp.conditions()) : null);
            result.add(wp);
            index++;
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private double[] resolveLatLon(Object rawLat, Object rawLon, Map<String, Object> values) {
        Object latResolved = resolvePlaceholderValue(rawLat, values);
        Object lonResolved = resolvePlaceholderValue(rawLon, values);

        if (latResolved instanceof Map<?, ?> coordMap) {
            Double lat = toDouble(((Map<String, Object>) coordMap).get("latitude"));
            Double lon = toDouble(((Map<String, Object>) coordMap).get("longitude"));
            if (lat != null && lon != null) {
                return new double[] { lat, lon };
            }
        }
        Double lat = toDouble(latResolved);
        Double lon = toDouble(lonResolved);
        if (lat == null || lon == null) {
            throw new BadRequestException(MessageCode.INVALID_COORDINATES);
        }
        return new double[] { lat, lon };
    }

    private Double resolveDouble(Object raw, Map<String, Object> values, Double fallback) {
        if (raw == null) {
            return fallback;
        }
        Object resolved = resolvePlaceholderValue(raw, values);
        Double parsed = toDouble(resolved);
        return parsed != null ? parsed : fallback;
    }

    private Object resolvePlaceholderValue(Object raw, Map<String, Object> values) {
        if (raw instanceof String text) {
            String trimmed = text.trim();
            String varKey = extractSingleVarKey(trimmed);
            if (varKey != null && values.containsKey(varKey)) {
                return values.get(varKey);
            }
            return interpolateText(trimmed, values);
        }
        return raw;
    }

    private String extractSingleVarKey(String text) {
        if (text.startsWith("${") && text.endsWith("}") && text.length() > 3) {
            return text.substring(2, text.length() - 1).trim();
        }
        if (text.startsWith("{{") && text.endsWith("}}") && text.length() > 4) {
            return text.substring(2, text.length() - 2).trim();
        }
        return null;
    }

    private String interpolateText(String input, Map<String, Object> values) {
        if (input == null || values == null || values.isEmpty()) {
            return input;
        }
        Matcher matcher = PLACEHOLDER_PATTERN.matcher(input);
        StringBuilder sb = new StringBuilder();
        while (matcher.find()) {
            String key = matcher.group(1) != null ? matcher.group(1).trim() : matcher.group(2).trim();
            Object val = values.get(key);
            matcher.appendReplacement(sb, Matcher.quoteReplacement(val != null ? String.valueOf(val) : matcher.group(0)));
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    private String resolveHubId(String explicitHubId, Object variableHubValue, Waypoint anchorWaypoint) {
        if (explicitHubId != null && !explicitHubId.isBlank()) {
            return explicitHubId.trim();
        }
        String fromVar = asString(variableHubValue);
        if (fromVar != null && !fromVar.isBlank()) {
            return fromVar.trim();
        }
        if (anchorWaypoint != null && anchorWaypoint.getLatitude() != null && anchorWaypoint.getLongitude() != null) {
            List<HubBriefVm> activeHubs = hubClientService.getActiveHubs();
            HubBriefVm nearest = null;
            double bestDist = Double.MAX_VALUE;
            for (HubBriefVm hub : activeHubs) {
                if (hub.latitude() == null || hub.longitude() == null) {
                    continue;
                }
                double dist = GeoUtils.haversine(
                        anchorWaypoint.getLatitude(), anchorWaypoint.getLongitude(),
                        hub.latitude(), hub.longitude());
                if (dist < bestDist) {
                    bestDist = dist;
                    nearest = hub;
                }
            }
            if (nearest != null) {
                return nearest.id();
            }
        }
        return null;
    }

    private Double toDouble(Object value) {
        if (value instanceof Number n) {
            return n.doubleValue();
        }
        if (value instanceof String s && !s.isBlank()) {
            try {
                return Double.parseDouble(s.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private String asString(Object value) {
        return value != null ? String.valueOf(value) : null;
    }
}

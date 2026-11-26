package com.utm.flight.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.commonlibrary.ai.LlmReasoningClient;
import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.commonlibrary.generator.BusinessCodeGenerator;
import com.utm.commonlibrary.generator.CodePatternRule;
import com.utm.commonlibrary.kafka.event.FlightLifecycleEvent;
import com.utm.commonlibrary.utils.AuthenticationUtils;
import com.utm.flight.config.FeasibilityConfig;
import com.utm.flight.kafka.FlightEventPublisher;
import com.utm.flight.mapper.FeasibilityMapper;
import com.utm.flight.mapper.FlightMapper;
import com.utm.flight.model.FeasibilityEvaluation;
import com.utm.flight.model.Flight;
import com.utm.flight.model.GeoJsonLineString;
import com.utm.flight.model.enumeration.FlightAuthorizationStatus;
import com.utm.flight.model.enumeration.FlightStatus;
import com.utm.flight.repository.FeasibilityEvaluationRepository;
import com.utm.flight.repository.FlightRepository;
import com.utm.flight.service.client.DroneClientService;
import com.utm.flight.service.client.MissionClientService;
import com.utm.flight.service.client.WeatherAisClientService;
import com.utm.flight.viewmodel.client.MissionBriefClientVm;
import com.utm.flight.viewmodel.client.WeatherGoNoGoClientVm;
import com.utm.flight.viewmodel.feasibility.DroneEnergySpecVm;
import com.utm.flight.viewmodel.feasibility.EnergyCalculationResultVm;
import com.utm.flight.viewmodel.feasibility.EnvConditionsVm;
import com.utm.flight.viewmodel.feasibility.FeasibilityCheckPostVm;
import com.utm.flight.viewmodel.feasibility.FeasibilityEvaluationListVm;
import com.utm.flight.viewmodel.feasibility.FeasibilityEvaluationVm;
import com.utm.flight.viewmodel.feasibility.FeasibilityOverridePostVm;
import com.utm.flight.viewmodel.feasibility.FeasibilityResultVm;
import com.utm.flight.viewmodel.feasibility.MissionProfileVm;
import com.utm.flight.viewmodel.feasibility.StandaloneFeasibilityCheckPostVm;
import com.utm.flight.viewmodel.feasibility.WindUsedVm;
import com.utm.flight.viewmodel.flight.FlightVm;
import jakarta.persistence.criteria.Predicate;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
public class FeasibilityServiceImpl implements FeasibilityService {

    private static final double EARTH_RADIUS_M = 6371000.0;

    private final FlightRepository flightRepository;
    private final FeasibilityEvaluationRepository evaluationRepository;
    private final EnergyModelService energyModelService;
    private final DroneClientService droneClientService;
    private final FeasibilityMapper feasibilityMapper;
    private final FlightMapper flightMapper;
    private final ObjectMapper objectMapper;
    private final FlightEventPublisher flightEventPublisher;
    private final WeatherAisClientService weatherAisClientService;
    private final MissionClientService missionClientService;
    private final LlmReasoningClient llmReasoningClient;

    public FeasibilityServiceImpl(
            FlightRepository flightRepository,
            FeasibilityEvaluationRepository evaluationRepository,
            EnergyModelService energyModelService,
            DroneClientService droneClientService,
            FeasibilityMapper feasibilityMapper,
            FlightMapper flightMapper,
            ObjectMapper objectMapper,
            FlightEventPublisher flightEventPublisher) {
        this(flightRepository, evaluationRepository, energyModelService, droneClientService,
                feasibilityMapper, flightMapper, objectMapper, flightEventPublisher, null, null, null);
    }

    @Autowired
    public FeasibilityServiceImpl(
            FlightRepository flightRepository,
            FeasibilityEvaluationRepository evaluationRepository,
            EnergyModelService energyModelService,
            DroneClientService droneClientService,
            FeasibilityMapper feasibilityMapper,
            FlightMapper flightMapper,
            ObjectMapper objectMapper,
            @Autowired(required = false) FlightEventPublisher flightEventPublisher,
            @Autowired(required = false) WeatherAisClientService weatherAisClientService,
            @Autowired(required = false) MissionClientService missionClientService,
            @Autowired(required = false) LlmReasoningClient llmReasoningClient) {
        this.flightRepository = flightRepository;
        this.evaluationRepository = evaluationRepository;
        this.energyModelService = energyModelService;
        this.droneClientService = droneClientService;
        this.feasibilityMapper = feasibilityMapper;
        this.flightMapper = flightMapper;
        this.objectMapper = objectMapper;
        this.flightEventPublisher = flightEventPublisher;
        this.weatherAisClientService = weatherAisClientService;
        this.missionClientService = missionClientService;
        this.llmReasoningClient = llmReasoningClient;
    }

    @Override
    @Transactional
    public FeasibilityResultVm checkFeasibility(String flightId, FeasibilityCheckPostVm request) {
        Flight flight = flightRepository.findById(flightId)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, "id", flightId));

        DroneEnergySpecVm droneSpec = resolveDroneSpec(flight.getDroneId());
        if (flight.getExpectedInitialBatteryPct() != null
                && (flight.getStatus() == FlightStatus.PLANNED || flight.getStatus() == FlightStatus.SCHEDULED)) {
            droneSpec = new DroneEnergySpecVm(
                    droneSpec.batteryCapacityWh(),
                    droneSpec.hoverPowerW(),
                    droneSpec.cruisePowerW(),
                    droneSpec.cruiseSpeedMs(),
                    droneSpec.batteryHealthPct(),
                    droneSpec.windToleranceMs(),
                    droneSpec.maxPayloadKg(),
                    droneSpec.maxFlightTimeMin(),
                    flight.getExpectedInitialBatteryPct());
        }

        double distanceM = 0.0;
        if (request != null && request.distanceM() != null && request.distanceM() > 0) {
            distanceM = request.distanceM();
        } else {
            distanceM = calculateRouteDistance(flight.getPlannedRoute());
        }

        double hoverTimeS = (request != null && request.hoverTimeS() != null && request.hoverTimeS() >= 0)
                ? request.hoverTimeS()
                : FeasibilityConfig.DEFAULT_HOVER_TIME_S;

        double payloadKg = (request != null && request.payloadKg() != null && request.payloadKg() >= 0)
                ? request.payloadKg()
                : (flight.getPayloadWeightKg() != null && flight.getPayloadWeightKg() >= 0
                        ? flight.getPayloadWeightKg()
                        : 0.0);

        Double windSpeedMs = null;
        String windSource = "default";
        if (request != null && request.weatherOverride() != null && request.weatherOverride().windSpeedMs() != null) {
            windSpeedMs = Math.max(0.0, request.weatherOverride().windSpeedMs());
            windSource = "override";
        } else if (weatherAisClientService != null && flight.getDepartureHubId() != null) {
            Optional<WeatherGoNoGoClientVm> liveWeather = weatherAisClientService.getWeatherGoNoGo(flight.getDepartureHubId());
            if (liveWeather.isPresent() && liveWeather.get().windSpeedMs() != null) {
                windSpeedMs = Math.max(0.0, liveWeather.get().windSpeedMs());
                windSource = liveWeather.get().windSource() != null ? liveWeather.get().windSource() : "metar";
            }
        }

        MissionProfileVm missionProfile = new MissionProfileVm(distanceM, hoverTimeS, payloadKg);
        EnvConditionsVm envConditions = new EnvConditionsVm(windSpeedMs);

        EnergyCalculationResultVm result = enrichExplanationWithLlm(
                energyModelService.calculateEnergy(droneSpec, missionProfile, envConditions),
                flight.getDroneId(), missionProfile, windSpeedMs, windSource);

        FeasibilityEvaluation evaluation = feasibilityMapper.toEntity(flight, result, windSpeedMs);
        evaluationRepository.save(evaluation);

        flight.setFeasibilityVerdict(result.verdict());
        flightRepository.save(flight);

        WindUsedVm windUsed = new WindUsedVm(windSpeedMs != null ? windSpeedMs : 0.0, windSource);
        return feasibilityMapper.toResultVm(flight, result, windUsed);
    }

    @Override
    @Transactional
    public FeasibilityResultVm checkStandaloneFeasibility(StandaloneFeasibilityCheckPostVm request) {
        String droneId = request.droneId().trim();
        DroneEnergySpecVm droneSpec = resolveDroneSpec(droneId);

        Optional<MissionBriefClientVm> missionOpt = Optional.empty();
        if (request.missionId() != null && !request.missionId().isBlank() && missionClientService != null) {
            missionOpt = missionClientService.getMissionById(request.missionId().trim());
        }

        double distanceM = resolveStandaloneDistance(request, missionOpt.orElse(null));
        double hoverTimeS = resolveStandaloneHoverTime(request, missionOpt.orElse(null));
        double payloadKg = resolveStandalonePayload(request, missionOpt.orElse(null));
        String hubId = request.departureHubId() != null && !request.departureHubId().isBlank()
                ? request.departureHubId().trim()
                : missionOpt.map(MissionBriefClientVm::departureHubId).orElse(null);

        Double windSpeedMs = null;
        String windSource = "default";
        if (request.windSpeedMs() != null) {
            windSpeedMs = Math.max(0.0, request.windSpeedMs());
            windSource = "override";
        } else if (weatherAisClientService != null && hubId != null) {
            Optional<WeatherGoNoGoClientVm> liveWeather = weatherAisClientService.getWeatherGoNoGo(hubId);
            if (liveWeather.isPresent() && liveWeather.get().windSpeedMs() != null) {
                windSpeedMs = Math.max(0.0, liveWeather.get().windSpeedMs());
                windSource = liveWeather.get().windSource() != null ? liveWeather.get().windSource() : "metar";
            }
        }

        MissionProfileVm missionProfile = new MissionProfileVm(distanceM, hoverTimeS, payloadKg);
        EnvConditionsVm envConditions = new EnvConditionsVm(windSpeedMs);

        EnergyCalculationResultVm result = enrichExplanationWithLlm(
                energyModelService.calculateEnergy(droneSpec, missionProfile, envConditions),
                droneId, missionProfile, windSpeedMs, windSource);

        FeasibilityEvaluation evaluation = feasibilityMapper.toEntity(null, droneId, result, windSpeedMs);
        evaluationRepository.save(evaluation);

        WindUsedVm windUsed = new WindUsedVm(windSpeedMs != null ? windSpeedMs : 0.0, windSource);
        return feasibilityMapper.toResultVm(null, droneId, result, windUsed);
    }

    private DroneEnergySpecVm resolveDroneSpec(String droneId) {
        return droneClientService.getDroneEnergySpec(droneId)
                .orElseGet(() -> new DroneEnergySpecVm(
                        500.0,
                        FeasibilityConfig.DEFAULT_HOVER_POWER_W,
                        FeasibilityConfig.DEFAULT_CRUISE_POWER_W,
                        FeasibilityConfig.DEFAULT_CRUISE_SPEED_MS,
                        FeasibilityConfig.DEFAULT_BATTERY_HEALTH_PCT,
                        FeasibilityConfig.DEFAULT_WIND_TOLERANCE_MS,
                        FeasibilityConfig.DEFAULT_MAX_PAYLOAD_KG,
                        FeasibilityConfig.DEFAULT_MAX_FLIGHT_TIME_MIN));
    }

    private double resolveStandaloneDistance(StandaloneFeasibilityCheckPostVm request, MissionBriefClientVm mission) {
        if (request.distanceM() != null && request.distanceM() > 0) {
            return request.distanceM();
        }
        if (mission != null) {
            if (mission.estimatedDistance() != null && mission.estimatedDistance() > 0) {
                return mission.estimatedDistance();
            }
            if (mission.waypoints() != null && mission.waypoints().size() >= 2) {
                List<MissionBriefClientVm.MissionWaypointItemVm> sorted = mission.waypoints().stream()
                        .filter(wp -> wp.latitude() != null && wp.longitude() != null)
                        .sorted(Comparator.comparingInt(wp -> wp.sequence() != null ? wp.sequence() : 0))
                        .toList();
                double total = 0.0;
                for (int i = 0; i < sorted.size() - 1; i++) {
                    total += haversineMeters(
                            sorted.get(i).latitude(), sorted.get(i).longitude(),
                            sorted.get(i + 1).latitude(), sorted.get(i + 1).longitude());
                }
                return total;
            }
        }
        return 1000.0;
    }

    private double resolveStandaloneHoverTime(StandaloneFeasibilityCheckPostVm request, MissionBriefClientVm mission) {
        if (request.hoverTimeS() != null && request.hoverTimeS() >= 0) {
            return request.hoverTimeS();
        }
        if (mission != null && mission.waypoints() != null && !mission.waypoints().isEmpty()) {
            int sumHover = mission.waypoints().stream()
                    .mapToInt(wp -> wp.hoverDurationSec() != null ? Math.max(0, wp.hoverDurationSec()) : 0)
                    .sum();
            if (sumHover > 0) {
                return sumHover;
            }
        }
        return FeasibilityConfig.DEFAULT_HOVER_TIME_S;
    }

    private double resolveStandalonePayload(StandaloneFeasibilityCheckPostVm request, MissionBriefClientVm mission) {
        if (request.payloadKg() != null && request.payloadKg() >= 0) {
            return request.payloadKg();
        }
        if (mission != null && mission.payloadWeightKg() != null && mission.payloadWeightKg() >= 0) {
            return mission.payloadWeightKg();
        }
        return 0.0;
    }

    private EnergyCalculationResultVm enrichExplanationWithLlm(
            EnergyCalculationResultVm deterministic,
            String droneId,
            MissionProfileVm profile,
            Double windSpeedMs,
            String windSource) {
        if (deterministic == null || llmReasoningClient == null || !llmReasoningClient.isEnabled()) {
            return deterministic;
        }
        String systemPrompt = "You are a UTM pre-flight safety analyst. Explain the deterministic energy feasibility outcome concisely in 2 sentences without altering numbers or verdict.";
        String userPrompt = String.format(
                "Drone=%s, Distance=%.0fm, Hover=%.0fs, Payload=%.2fkg, Wind=%.1fm/s (%s), Usable=%.1fWh, Required=%.1fWh, Margin=%.1f%%, Verdict=%s.",
                droneId, profile.distanceM(), profile.hoverTimeS(), profile.payloadKg(),
                windSpeedMs != null ? windSpeedMs : 0.0, windSource,
                deterministic.usableWh(), deterministic.requiredWh(),
                deterministic.marginPct(), deterministic.verdict());
        return llmReasoningClient.generateText(systemPrompt, userPrompt, 180)
                .map(llmText -> new EnergyCalculationResultVm(
                        deterministic.verdict(),
                        deterministic.marginPct(),
                        deterministic.usableWh(),
                        deterministic.requiredWh(),
                        deterministic.cruiseWh(),
                        deterministic.hoverWh(),
                        deterministic.climbWh(),
                        deterministic.payloadFactor(),
                        deterministic.windFactor(),
                        deterministic.confidence(),
                        deterministic.windExceeded(),
                        deterministic.solutions(),
                        llmText,
                        "llm"))
                .orElse(deterministic);
    }

    @Override
    @Transactional
    public FlightVm overrideFeasibility(String flightId, FeasibilityOverridePostVm request) {
        Flight flight = flightRepository.findById(flightId)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, "id", flightId));

        if (flight.getStatus() == FlightStatus.ACTIVE || flight.getStatus() == FlightStatus.COMPLETED
                || flight.getStatus() == FlightStatus.CANCELLED || flight.getStatus() == FlightStatus.EMERGENCY_LANDING
                || flight.getStatus() == FlightStatus.DIVERTED) {
            throw new BadRequestException(MessageCode.INVALID_FLIGHT_STATE,
                    "Cannot override feasibility for an active, completed, cancelled, diverted, or emergency landing flight");
        }

        String approver = resolveApprover(request.approvedBy());
        String justification = String.format("Override by %s: %s", approver,
                request.reason().trim());
        flight.setFeasibilityOverride(justification);

        boolean newlyAuthorized = false;
        if (flight.getAuthorizationStatus() == FlightAuthorizationStatus.PENDING) {
            flight.setAuthorizationStatus(FlightAuthorizationStatus.APPROVED);
            flight.setStatus(FlightStatus.AUTHORIZED);
            if (flight.getAuthorizationNumber() == null || flight.getAuthorizationNumber().isBlank()) {
                flight.setAuthorizationNumber(BusinessCodeGenerator.generateUnique(
                        new CodePatternRule("AUTH", "yyyyMMdd", 4, "-"),
                        flightRepository::existsByAuthorizationNumber));
            }
            flight.setAuthorizedBy(approver);
            flight.setAuthorizedAt(java.time.ZonedDateTime.now());
            newlyAuthorized = true;
        }

        Flight saved = flightRepository.save(flight);
        if (newlyAuthorized && flightEventPublisher != null) {
            flightEventPublisher.publish(FlightLifecycleEvent.FLIGHT_AUTHORIZED, saved, null, null, justification);
        }
        log.info("Feasibility override applied to flight {} by {}", flightId, approver);
        return flightMapper.toVm(saved);
    }

    private String resolveApprover(String fallbackApprover) {
        try {
            return AuthenticationUtils.extractUserId();
        } catch (Exception ignored) {
            return fallbackApprover != null && !fallbackApprover.isBlank()
                    ? fallbackApprover.trim()
                    : "SYSTEM";
        }
    }

    @Override
    @Transactional(readOnly = true)
    public FeasibilityEvaluationListVm getHistory(String flightId, String droneId, int limit, int offset) {
        Specification<FeasibilityEvaluation> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (flightId != null && !flightId.isBlank()) {
                predicates.add(cb.equal(root.get("flight").get("id"), flightId.trim()));
            }
            if (droneId != null && !droneId.isBlank()) {
                predicates.add(cb.equal(root.get("droneId"), droneId.trim()));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        if (limit <= 0) {
            List<FeasibilityEvaluation> all = evaluationRepository.findAll(spec,
                    Sort.by(Sort.Direction.DESC, "createdOn"));
            List<FeasibilityEvaluationVm> vms = feasibilityMapper.toEvaluationVmList(all);
            return FeasibilityEvaluationListVm.of(vms, all.size());
        }

        int pageIndex = Math.max(0, offset) / limit;
        PageRequest pageRequest = PageRequest.of(pageIndex, limit, Sort.by(Sort.Direction.DESC, "createdOn"));
        Page<FeasibilityEvaluation> page = evaluationRepository.findAll(spec, pageRequest);

        List<FeasibilityEvaluationVm> vms = feasibilityMapper.toEvaluationVmList(page.getContent());
        return FeasibilityEvaluationListVm.of(vms, page.getTotalElements());
    }

    private double calculateRouteDistance(GeoJsonLineString route) {
        if (route == null || route.coordinates() == null || route.coordinates().size() < 2) {
            return 0.0;
        }

        List<List<Double>> coords = route.coordinates();
        double totalDistance = 0.0;
        for (int i = 0; i < coords.size() - 1; i++) {
            List<Double> p1 = coords.get(i);
            List<Double> p2 = coords.get(i + 1);
            if (p1 != null && p1.size() >= 2 && p2 != null && p2.size() >= 2
                    && p1.get(0) != null && p1.get(1) != null && p2.get(0) != null && p2.get(1) != null) {
                totalDistance += haversineMeters(p1.get(1), p1.get(0), p2.get(1), p2.get(0));
            }
        }
        return totalDistance;
    }

    private double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                        * Math.sin(dLon / 2.0) * Math.sin(dLon / 2.0);
        double c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
        return EARTH_RADIUS_M * c;
    }
}

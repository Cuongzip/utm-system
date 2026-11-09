package com.utm.flight.service;

import com.utm.flight.service.client.DroneClientService;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.flight.config.FeasibilityConfig;
import com.utm.flight.mapper.FeasibilityMapper;
import com.utm.flight.mapper.FlightMapper;
import com.utm.flight.model.FeasibilityEvaluation;
import com.utm.flight.model.Flight;
import com.utm.flight.model.enumeration.FlightAuthorizationStatus;
import com.utm.flight.model.enumeration.FlightStatus;
import com.utm.flight.repository.FeasibilityEvaluationRepository;
import com.utm.flight.repository.FlightRepository;
import com.utm.flight.viewmodel.feasibility.DroneEnergySpecVm;
import com.utm.flight.viewmodel.feasibility.EnergyCalculationResultVm;
import com.utm.flight.viewmodel.feasibility.EnvConditionsVm;
import com.utm.flight.viewmodel.feasibility.FeasibilityCheckPostVm;
import com.utm.flight.viewmodel.feasibility.FeasibilityEvaluationListVm;
import com.utm.flight.viewmodel.feasibility.FeasibilityEvaluationVm;
import com.utm.flight.viewmodel.feasibility.FeasibilityOverridePostVm;
import com.utm.flight.viewmodel.feasibility.FeasibilityResultVm;
import com.utm.flight.viewmodel.flight.FlightVm;
import com.utm.flight.viewmodel.feasibility.MissionProfileVm;
import com.utm.flight.viewmodel.feasibility.WindUsedVm;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
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

    @Override
    @Transactional
    public FeasibilityResultVm checkFeasibility(String flightId, FeasibilityCheckPostVm request) {
        Flight flight = flightRepository.findById(flightId)
                .orElseThrow(() -> new NotFoundException(MessageCode.FLIGHT_NOT_FOUND, "id", flightId));

        DroneEnergySpecVm droneSpec = droneClientService.getDroneEnergySpec(flight.getDroneId())
                .orElseGet(() -> new DroneEnergySpecVm(
                        500.0,
                        FeasibilityConfig.DEFAULT_HOVER_POWER_W,
                        FeasibilityConfig.DEFAULT_CRUISE_POWER_W,
                        FeasibilityConfig.DEFAULT_CRUISE_SPEED_MS,
                        FeasibilityConfig.DEFAULT_BATTERY_HEALTH_PCT,
                        FeasibilityConfig.DEFAULT_WIND_TOLERANCE_MS,
                        FeasibilityConfig.DEFAULT_MAX_PAYLOAD_KG,
                        FeasibilityConfig.DEFAULT_MAX_FLIGHT_TIME_MIN));

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
                : 0.0;

        Double windSpeedMs = null;
        String windSource = "default";
        if (request != null && request.weatherOverride() != null && request.weatherOverride().windSpeedMs() != null) {
            windSpeedMs = Math.max(0.0, request.weatherOverride().windSpeedMs());
            windSource = "override";
        }

        MissionProfileVm missionProfile = new MissionProfileVm(distanceM, hoverTimeS, payloadKg);
        EnvConditionsVm envConditions = new EnvConditionsVm(windSpeedMs);

        EnergyCalculationResultVm result = energyModelService.calculateEnergy(droneSpec, missionProfile, envConditions);

        FeasibilityEvaluation evaluation = feasibilityMapper.toEntity(flight, result, windSpeedMs);
        evaluationRepository.save(evaluation);

        flight.setFeasibilityVerdict(result.verdict());
        flightRepository.save(flight);

        WindUsedVm windUsed = new WindUsedVm(windSpeedMs != null ? windSpeedMs : 0.0, windSource);
        return feasibilityMapper.toResultVm(flight, result, windUsed);
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

        String justification = String.format("Override by %s: %s", request.approvedBy().trim(),
                request.reason().trim());
        flight.setFeasibilityOverride(justification);

        if (flight.getAuthorizationStatus() == FlightAuthorizationStatus.PENDING) {
            flight.setAuthorizationStatus(FlightAuthorizationStatus.APPROVED);
            flight.setStatus(FlightStatus.AUTHORIZED);
        }

        Flight saved = flightRepository.save(flight);
        log.info("Feasibility override applied to flight {} by {}", flightId, request.approvedBy());
        return flightMapper.toVm(saved);
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

        int pageIndex = offset / limit;
        PageRequest pageRequest = PageRequest.of(pageIndex, limit, Sort.by(Sort.Direction.DESC, "createdOn"));
        Page<FeasibilityEvaluation> page = evaluationRepository.findAll(spec, pageRequest);

        List<FeasibilityEvaluationVm> vms = feasibilityMapper.toEvaluationVmList(page.getContent());
        return FeasibilityEvaluationListVm.of(vms, page.getTotalElements());
    }

    private double calculateRouteDistance(String routeJson) {
        if (routeJson == null || routeJson.isBlank()) {
            return 0.0;
        }

        try {
            JsonNode rootNode = objectMapper.readTree(routeJson);
            JsonNode coordinatesNode = rootNode.get("coordinates");
            if (coordinatesNode == null || !coordinatesNode.isArray() || coordinatesNode.size() < 2) {
                return 0.0;
            }

            double totalDistance = 0.0;
            for (int i = 0; i < coordinatesNode.size() - 1; i++) {
                JsonNode p1 = coordinatesNode.get(i);
                JsonNode p2 = coordinatesNode.get(i + 1);
                if (p1.isArray() && p1.size() >= 2 && p2.isArray() && p2.size() >= 2) {
                    double lon1 = p1.get(0).asDouble();
                    double lat1 = p1.get(1).asDouble();
                    double lon2 = p2.get(0).asDouble();
                    double lat2 = p2.get(1).asDouble();
                    totalDistance += haversineMeters(lat1, lon1, lat2, lon2);
                }
            }
            return totalDistance;
        } catch (Exception e) {
            log.warn("Failed to parse plannedRoute coordinates for distance calculation: {}", e.getMessage());
            return 0.0;
        }
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

package com.utm.flight.mapper;

import com.utm.flight.model.FeasibilityEvaluation;
import com.utm.flight.model.FeasibilitySolution;
import com.utm.flight.model.Flight;
import com.utm.flight.viewmodel.feasibility.EnergyBreakdownVm;
import com.utm.flight.viewmodel.feasibility.EnergyCalculationResultVm;
import com.utm.flight.viewmodel.feasibility.FeasibilityEvaluationVm;
import com.utm.flight.viewmodel.feasibility.FeasibilityResultVm;
import com.utm.flight.viewmodel.feasibility.FeasibilitySolutionVm;
import com.utm.flight.viewmodel.feasibility.WindUsedVm;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.Named;

import java.util.Collections;
import java.util.List;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING, builder = @Builder(disableBuilder = true))
public interface FeasibilityMapper {

    FeasibilitySolution toSolutionModel(FeasibilitySolutionVm vm);

    FeasibilitySolutionVm toSolutionVm(FeasibilitySolution model);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "flight", source = "flight")
    @Mapping(target = "droneId", source = "droneId")
    @Mapping(target = "verdict", source = "result.verdict")
    @Mapping(target = "marginPct", source = "result.marginPct")
    @Mapping(target = "usableWh", source = "result.usableWh")
    @Mapping(target = "requiredWh", source = "result.requiredWh")
    @Mapping(target = "cruiseWh", source = "result.cruiseWh")
    @Mapping(target = "hoverWh", source = "result.hoverWh")
    @Mapping(target = "climbWh", source = "result.climbWh")
    @Mapping(target = "payloadFactor", source = "result.payloadFactor")
    @Mapping(target = "windFactor", source = "result.windFactor")
    @Mapping(target = "windSpeedMs", source = "windSpeedMs")
    @Mapping(target = "confidence", source = "result.confidence")
    @Mapping(target = "solutions", source = "result.solutions", qualifiedByName = "toSolutionModels")
    @Mapping(target = "explanation", source = "result.explanation")
    @Mapping(target = "explanationSource", source = "result.explanationSource")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    FeasibilityEvaluation toEntity(Flight flight, String droneId, EnergyCalculationResultVm result, Double windSpeedMs);

    default FeasibilityEvaluation toEntity(Flight flight, EnergyCalculationResultVm result, Double windSpeedMs) {
        String droneId = flight != null ? flight.getDroneId() : null;
        return toEntity(flight, droneId, result, windSpeedMs);
    }

    @Mapping(target = "flightId", source = "flightId")
    @Mapping(target = "droneId", source = "droneId")
    @Mapping(target = "verdict", source = "result.verdict")
    @Mapping(target = "marginPct", source = "result.marginPct")
    @Mapping(target = "usableWh", source = "result.usableWh")
    @Mapping(target = "requiredWh", source = "result.requiredWh")
    @Mapping(target = "breakdown", source = "result", qualifiedByName = "resultToBreakdown")
    @Mapping(target = "windUsed", source = "windUsed")
    @Mapping(target = "confidence", source = "result.confidence")
    @Mapping(target = "solutions", source = "result.solutions")
    @Mapping(target = "explanation", source = "result.explanation")
    @Mapping(target = "explanationSource", source = "result.explanationSource")
    @Mapping(target = "evaluatedAt", expression = "java(java.time.ZonedDateTime.now())")
    FeasibilityResultVm toResultVm(String flightId, String droneId, EnergyCalculationResultVm result,
            WindUsedVm windUsed);

    default FeasibilityResultVm toResultVm(Flight flight, EnergyCalculationResultVm result, WindUsedVm windUsed) {
        if (flight == null) {
            return null;
        }
        return toResultVm(flight.getId(), flight.getDroneId(), result, windUsed);
    }

    @Mapping(target = "flightId", source = "entity.flight.id")
    @Mapping(target = "breakdown", source = "entity", qualifiedByName = "entityToBreakdown")
    @Mapping(target = "solutions", source = "solutions", qualifiedByName = "toSolutionVms")
    FeasibilityEvaluationVm toEvaluationVm(FeasibilityEvaluation entity);

    List<FeasibilityEvaluationVm> toEvaluationVmList(List<FeasibilityEvaluation> entities);

    @Named("resultToBreakdown")
    default EnergyBreakdownVm resultToBreakdown(EnergyCalculationResultVm result) {
        if (result == null) {
            return null;
        }
        return new EnergyBreakdownVm(
                result.cruiseWh(),
                result.hoverWh(),
                result.climbWh(),
                result.payloadFactor(),
                result.windFactor());
    }

    @Named("entityToBreakdown")
    default EnergyBreakdownVm entityToBreakdown(FeasibilityEvaluation entity) {
        if (entity == null) {
            return null;
        }
        return new EnergyBreakdownVm(
                entity.getCruiseWh(),
                entity.getHoverWh(),
                entity.getClimbWh(),
                entity.getPayloadFactor(),
                entity.getWindFactor());
    }

    @Named("toSolutionModels")
    default List<FeasibilitySolution> toSolutionModels(List<FeasibilitySolutionVm> vms) {
        if (vms == null || vms.isEmpty()) {
            return Collections.emptyList();
        }
        return vms.stream().map(this::toSolutionModel).toList();
    }

    @Named("toSolutionVms")
    default List<FeasibilitySolutionVm> toSolutionVms(List<FeasibilitySolution> models) {
        if (models == null || models.isEmpty()) {
            return Collections.emptyList();
        }
        return models.stream().map(this::toSolutionVm).toList();
    }
}

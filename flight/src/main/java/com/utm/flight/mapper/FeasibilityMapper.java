package com.utm.flight.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.flight.model.FeasibilityEvaluation;
import com.utm.flight.model.Flight;
import com.utm.flight.viewmodel.EnergyBreakdownVm;
import com.utm.flight.viewmodel.EnergyCalculationResultVm;
import com.utm.flight.viewmodel.FeasibilityEvaluationVm;
import com.utm.flight.viewmodel.FeasibilityResultVm;
import com.utm.flight.viewmodel.FeasibilitySolutionVm;
import com.utm.flight.viewmodel.WindUsedVm;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.Named;

import java.util.Collections;
import java.util.List;

@Mapper(
        componentModel = MappingConstants.ComponentModel.SPRING,
        builder = @Builder(disableBuilder = true)
)
public interface FeasibilityMapper {

    ObjectMapper OBJECT_MAPPER = new ObjectMapper();

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
    @Mapping(target = "solutionsJson", source = "result.solutions", qualifiedByName = "solutionsToString")
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
    FeasibilityResultVm toResultVm(String flightId, String droneId, EnergyCalculationResultVm result, WindUsedVm windUsed);

    default FeasibilityResultVm toResultVm(Flight flight, EnergyCalculationResultVm result, WindUsedVm windUsed) {
        if (flight == null) {
            return null;
        }
        return toResultVm(flight.getId(), flight.getDroneId(), result, windUsed);
    }

    @Mapping(target = "flightId", source = "entity.flight.id")
    @Mapping(target = "breakdown", source = "entity", qualifiedByName = "entityToBreakdown")
    @Mapping(target = "solutions", source = "solutionsJson", qualifiedByName = "stringToSolutions")
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
                result.windFactor()
        );
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
                entity.getWindFactor()
        );
    }

    @Named("solutionsToString")
    default String solutionsToString(List<FeasibilitySolutionVm> solutions) {
        if (solutions == null || solutions.isEmpty()) {
            return "[]";
        }
        try {
            return OBJECT_MAPPER.writeValueAsString(solutions);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }

    @Named("stringToSolutions")
    default List<FeasibilitySolutionVm> stringToSolutions(String solutionsJson) {
        if (solutionsJson == null || solutionsJson.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return OBJECT_MAPPER.readValue(solutionsJson, new TypeReference<List<FeasibilitySolutionVm>>() {});
        } catch (JsonProcessingException e) {
            return Collections.emptyList();
        }
    }

    default String serializeSolutions(List<FeasibilitySolutionVm> solutions) {
        return solutionsToString(solutions);
    }

    default List<FeasibilitySolutionVm> deserializeSolutions(String solutionsJson) {
        return stringToSolutions(solutionsJson);
    }
}

package com.utm.emergency.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.emergency.model.EmergencyConfig;
import com.utm.emergency.viewmodel.config.EmergencyConfigVm;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(
        componentModel = MappingConstants.ComponentModel.SPRING,
        builder = @Builder(disableBuilder = true),
        unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface EmergencyConfigMapper {

    ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Mapping(target = "value", source = "value", qualifiedByName = "stringToJsonNode")
    EmergencyConfigVm toVm(EmergencyConfig entity);

    List<EmergencyConfigVm> toVmList(List<EmergencyConfig> entities);

    @Named("stringToJsonNode")
    default JsonNode stringToJsonNode(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return OBJECT_MAPPER.readTree(json);
        } catch (JsonProcessingException e) {
            return null;
        }
    }
}
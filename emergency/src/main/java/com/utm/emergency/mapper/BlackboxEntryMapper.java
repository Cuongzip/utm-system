package com.utm.emergency.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.emergency.model.BlackboxEntry;
import com.utm.emergency.viewmodel.blackbox.BlackboxEntryPostVm;
import com.utm.emergency.viewmodel.blackbox.BlackboxEntryVm;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;

import java.util.Collections;
import java.util.List;

@Mapper(
        componentModel = MappingConstants.ComponentModel.SPRING,
        builder = @Builder(disableBuilder = true),
        unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface BlackboxEntryMapper {

    ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Mapping(target = "motorRpm", source = "motorRpm", qualifiedByName = "stringToDoubleList")
    @Mapping(target = "motorTemps", source = "motorTemps", qualifiedByName = "stringToDoubleList")
    BlackboxEntryVm toVm(BlackboxEntry entity);

    List<BlackboxEntryVm> toVmList(List<BlackboxEntry> entities);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "motorRpm", source = "motorRpm", qualifiedByName = "doubleListToString")
    @Mapping(target = "motorTemps", source = "motorTemps", qualifiedByName = "doubleListToString")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    BlackboxEntry toEntity(BlackboxEntryPostVm postVm);

    @Named("stringToDoubleList")
    default List<Double> stringToDoubleList(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return OBJECT_MAPPER.readValue(json, new TypeReference<List<Double>>() {});
        } catch (JsonProcessingException e) {
            return Collections.emptyList();
        }
    }

    @Named("doubleListToString")
    default String doubleListToString(List<Double> list) {
        if (list == null || list.isEmpty()) return null;
        try {
            return OBJECT_MAPPER.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            return null;
        }
    }
}
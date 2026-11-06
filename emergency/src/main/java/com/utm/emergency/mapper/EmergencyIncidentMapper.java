package com.utm.emergency.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.utm.emergency.model.EmergencyIncident;
import com.utm.emergency.viewmodel.incident.EmergencyIncidentPostVm;
import com.utm.emergency.viewmodel.incident.EmergencyIncidentVm;
import com.utm.emergency.viewmodel.incident.IncidentTimelineEventVm;
import com.utm.emergency.viewmodel.incident.RootCauseVm;
import org.mapstruct.BeanMapping;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

import java.util.Collections;
import java.util.List;

@Mapper(
        componentModel = MappingConstants.ComponentModel.SPRING,
        builder = @Builder(disableBuilder = true),
        unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface EmergencyIncidentMapper {

    ObjectMapper OBJECT_MAPPER = new ObjectMapper().registerModule(new JavaTimeModule());

    @Mapping(target = "detectionData", source = "detectionData", qualifiedByName = "stringToJsonNode")
    @Mapping(target = "timeline", source = "timeline", qualifiedByName = "stringToTimelineList")
    EmergencyIncidentVm toVm(EmergencyIncident entity);

    List<EmergencyIncidentVm> toVmList(List<EmergencyIncident> entities);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", constant = "active")
    @Mapping(target = "detectedAt", expression = "java(java.time.ZonedDateTime.now())")
    @Mapping(target = "detectionData", source = "detectionData", qualifiedByName = "objectToJsonString")
    @Mapping(target = "wasAutoExecuted", constant = "false")
    EmergencyIncident toEntity(EmergencyIncidentPostVm postVm);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "rootCause", source = "rootCauseVm.rootCause")
    @Mapping(target = "rootCauseNotes", source = "rootCauseVm.notes")
    @Mapping(target = "lessonsLearned", source = "rootCauseVm.lessonsLearned")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    void updateEntityFromRootCauseVm(@MappingTarget EmergencyIncident entity, RootCauseVm rootCauseVm);

    @Named("stringToJsonNode")
    default JsonNode stringToJsonNode(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return OBJECT_MAPPER.readTree(json);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    @Named("objectToJsonString")
    default String objectToJsonString(Object data) {
        if (data == null) return null;
        if (data instanceof String str) return str;
        try {
            return OBJECT_MAPPER.writeValueAsString(data);
        } catch (JsonProcessingException e) {
            return data.toString();
        }
    }

    @Named("stringToTimelineList")
    default List<IncidentTimelineEventVm> stringToTimelineList(String timelineJson) {
        if (timelineJson == null || timelineJson.isBlank()) return Collections.emptyList();
        try {
            return OBJECT_MAPPER.readValue(timelineJson, new TypeReference<List<IncidentTimelineEventVm>>() {});
        } catch (JsonProcessingException e) {
            return Collections.emptyList();
        }
    }

    @Named("timelineListToString")
    default String timelineListToString(List<IncidentTimelineEventVm> timeline) {
        if (timeline == null || timeline.isEmpty()) return null;
        try {
            return OBJECT_MAPPER.writeValueAsString(timeline);
        } catch (JsonProcessingException e) {
            return null;
        }
    }
}

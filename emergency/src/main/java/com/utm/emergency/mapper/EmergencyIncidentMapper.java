package com.utm.emergency.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.utm.emergency.model.EmergencyIncident;
import com.utm.emergency.viewmodel.incident.EmergencyIncidentVm;
import com.utm.emergency.viewmodel.incident.IncidentTimelineEventVm;
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
public interface EmergencyIncidentMapper {

    ObjectMapper OBJECT_MAPPER = new ObjectMapper().registerModule(new JavaTimeModule());

    @Mapping(target = "detectionData", source = "detectionData", qualifiedByName = "stringToJsonNode")
    @Mapping(target = "timeline", source = "timeline", qualifiedByName = "stringToTimelineList")
    EmergencyIncidentVm toVm(EmergencyIncident entity);

    List<EmergencyIncidentVm> toVmList(List<EmergencyIncident> entities);

    @Named("stringToJsonNode")
    default JsonNode stringToJsonNode(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return OBJECT_MAPPER.readTree(json);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    @Named("jsonNodeToString")
    default String jsonNodeToString(JsonNode node) {
        if (node == null || node.isNull()) return null;
        return node.toString();
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
package com.utm.emergency.mapper;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.utm.emergency.model.EmergencyIncident;
import com.utm.emergency.model.IncidentTimelineEntry;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Mapper(
        componentModel = MappingConstants.ComponentModel.SPRING,
        builder = @Builder(disableBuilder = true),
        unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface EmergencyIncidentMapper {

    ObjectMapper OBJECT_MAPPER = new ObjectMapper().registerModule(new JavaTimeModule());

    @Mapping(target = "timeline", source = "timeline", qualifiedByName = "toTimelineVmList")
    EmergencyIncidentVm toVm(EmergencyIncident entity);

    List<EmergencyIncidentVm> toVmList(List<EmergencyIncident> entities);

    IncidentTimelineEventVm toTimelineVm(IncidentTimelineEntry entry);

    @Named("toTimelineVmList")
    default List<IncidentTimelineEventVm> toTimelineVmList(List<IncidentTimelineEntry> timeline) {
        if (timeline == null || timeline.isEmpty()) {
            return Collections.emptyList();
        }
        return timeline.stream().map(this::toTimelineVm).toList();
    }

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "protocolId", ignore = true)
    @Mapping(target = "flightId", source = "flightId", qualifiedByName = "incidentBlankToNull")
    @Mapping(target = "status", constant = "ACTIVE")
    @Mapping(target = "detectedAt", expression = "java(java.time.ZonedDateTime.now())")
    @Mapping(target = "detectionData", source = "detectionData", qualifiedByName = "objectToDetectionMap")
    @Mapping(target = "timeline", expression = "java(new java.util.ArrayList<>())")
    @Mapping(target = "wasAutoExecuted", constant = "false")
    @Mapping(target = "version", constant = "0L")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
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

    @Named("incidentBlankToNull")
    default String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }

    @Named("objectToDetectionMap")
    @SuppressWarnings("unchecked")
    default Map<String, Object> objectToDetectionMap(Object data) {
        if (data == null) {
            return null;
        }
        if (data instanceof Map<?, ?> map) {
            Map<String, Object> copy = new LinkedHashMap<>();
            map.forEach((k, v) -> copy.put(String.valueOf(k), v));
            return copy;
        }
        if (data instanceof String str) {
            if (str.isBlank()) {
                return null;
            }
            try {
                return OBJECT_MAPPER.readValue(str, new TypeReference<Map<String, Object>>() {});
            } catch (Exception e) {
                return Map.of("raw", str);
            }
        }
        try {
            return OBJECT_MAPPER.convertValue(data, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return Map.of("value", data.toString());
        }
    }
}

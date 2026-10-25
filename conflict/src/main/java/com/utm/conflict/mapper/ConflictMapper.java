package com.utm.conflict.mapper;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.conflict.model.Conflict;
import com.utm.conflict.model.enumeration.ConflictSeverity;
import com.utm.conflict.model.enumeration.ConflictStatus;
import com.utm.conflict.model.enumeration.ConflictType;
import com.utm.conflict.viewmodel.ConflictVm;
import com.utm.conflict.viewmodel.LocationVm;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Mapper(
        componentModel = "spring",
        builder = @org.mapstruct.Builder(disableBuilder = true)
)
public abstract class ConflictMapper {

    @Autowired
    protected ObjectMapper objectMapper;

    @Mapping(target = "location", source = "entity", qualifiedByName = "mapLocation")
    @Mapping(target = "resolutionActions", source = "resolutionActions", qualifiedByName = "mapResolutionActions")
    public abstract ConflictVm toVm(Conflict entity);

    public abstract List<ConflictVm> toVmList(List<Conflict> entities);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", expression = "java(com.utm.conflict.model.enumeration.ConflictStatus.DETECTED)")
    @Mapping(target = "conflictType", expression = "java(mapConflictTypeFromPost(postVm.conflictType()))")
    @Mapping(target = "severity", expression = "java(mapSeverityFromPost(postVm.severity()))")
    @Mapping(target = "detectedAt", expression = "java(java.time.ZonedDateTime.now())")
    @Mapping(target = "detectionMethod", constant = "automated_conformance")
    @Mapping(target = "resolutionStrategy", ignore = true)
    @Mapping(target = "resolutionActions", ignore = true)
    @Mapping(target = "resolvedAt", ignore = true)
    @Mapping(target = "resolvedBy", ignore = true)
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", source = "createdBy")
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    public abstract Conflict toEntity(com.utm.conflict.viewmodel.ConflictPostVm postVm, String createdBy);

    protected ConflictType mapConflictTypeFromPost(String type) {
        ConflictType parsed = ConflictType.fromValue(type);
        return parsed != null ? parsed : ConflictType.GEOFENCE_VIOLATION;
    }

    protected ConflictSeverity mapSeverityFromPost(String severity) {
        ConflictSeverity parsed = ConflictSeverity.fromValue(severity);
        return parsed != null ? parsed : ConflictSeverity.CRITICAL;
    }

    @Named("mapLocation")
    protected LocationVm mapLocation(Conflict entity) {
        if (entity == null || (entity.getLocationLat() == null && entity.getLocationLon() == null)) {
            return null;
        }
        return new LocationVm(entity.getLocationLat(), entity.getLocationLon());
    }

    @Named("mapResolutionActions")
    protected Map<String, Object> mapResolutionActions(String resolutionActionsJson) {
        if (resolutionActionsJson == null || resolutionActionsJson.isBlank()) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.readValue(resolutionActionsJson, new TypeReference<>() {});
        } catch (Exception ex) {
            return Collections.singletonMap("raw", resolutionActionsJson);
        }
    }
}

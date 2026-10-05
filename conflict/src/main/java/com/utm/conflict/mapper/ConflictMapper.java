package com.utm.conflict.mapper;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.conflict.model.Conflict;
import com.utm.conflict.model.enumeration.ConflictSeverity;
import com.utm.conflict.model.enumeration.ConflictStatus;
import com.utm.conflict.model.enumeration.ConflictType;
import com.utm.conflict.model.enumeration.ResolutionStrategy;
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
    @Mapping(target = "conflictType", source = "conflictType", qualifiedByName = "mapConflictType")
    @Mapping(target = "severity", source = "severity", qualifiedByName = "mapSeverity")
    @Mapping(target = "status", source = "status", qualifiedByName = "mapStatus")
    @Mapping(target = "resolutionStrategy", source = "resolutionStrategy", qualifiedByName = "mapResolutionStrategy")
    public abstract ConflictVm toVm(Conflict entity);

    public abstract List<ConflictVm> toVmList(List<Conflict> entities);

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

    @Named("mapConflictType")
    protected String mapConflictType(ConflictType type) {
        return type != null ? type.getValue() : null;
    }

    @Named("mapSeverity")
    protected String mapSeverity(ConflictSeverity severity) {
        return severity != null ? severity.getValue() : null;
    }

    @Named("mapStatus")
    protected String mapStatus(ConflictStatus status) {
        return status != null ? status.getValue() : null;
    }

    @Named("mapResolutionStrategy")
    protected String mapResolutionStrategy(ResolutionStrategy strategy) {
        return strategy != null ? strategy.getValue() : null;
    }
}

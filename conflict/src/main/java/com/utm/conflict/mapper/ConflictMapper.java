package com.utm.conflict.mapper;

import com.utm.conflict.model.Conflict;
import com.utm.conflict.model.enumeration.ConflictSeverity;
import com.utm.conflict.model.enumeration.ConflictType;
import com.utm.conflict.viewmodel.client.LocationVm;
import com.utm.conflict.viewmodel.conflict.ConflictPostVm;
import com.utm.conflict.viewmodel.conflict.ConflictVm;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, builder = @org.mapstruct.Builder(disableBuilder = true))
public abstract class ConflictMapper {

    @Mapping(target = "location", source = "entity", qualifiedByName = "mapLocation")
    @Mapping(target = "resolutionActions", source = "resolutionActions", qualifiedByName = "mapResolutionActions")
    public abstract ConflictVm toVm(Conflict entity);

    public abstract List<ConflictVm> toVmList(List<Conflict> entities);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "secondaryFlightId", source = "postVm.secondaryFlightId", qualifiedByName = "trimBlankToNull")
    @Mapping(target = "hubId", source = "postVm.hubId", qualifiedByName = "trimBlankToNull")
    @Mapping(target = "airspaceZoneId", source = "postVm.airspaceZoneId", qualifiedByName = "trimBlankToNull")
    @Mapping(target = "status", expression = "java(com.utm.conflict.model.enumeration.ConflictStatus.DETECTED)")
    @Mapping(target = "conflictType", expression = "java(mapConflictTypeFromPost(postVm.conflictType()))")
    @Mapping(target = "severity", expression = "java(mapSeverityFromPost(postVm.severity()))")
    @Mapping(target = "maxSeverity", expression = "java(mapSeverityFromPost(postVm.severity()))")
    @Mapping(target = "minSeparationDistance", source = "postVm.separationDistance")
    @Mapping(target = "detectedAt", expression = "java(java.time.ZonedDateTime.now())")
    @Mapping(target = "detectionMethod", constant = "automated_conformance")
    @Mapping(target = "resolutionStrategy", ignore = true)
    @Mapping(target = "resolutionActions", ignore = true)
    @Mapping(target = "resolvedAt", ignore = true)
    @Mapping(target = "resolvedBy", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", source = "createdBy")
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    public abstract Conflict toEntity(ConflictPostVm postVm, String createdBy);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "primaryFlightId", ignore = true)
    @Mapping(target = "secondaryFlightId", ignore = true)
    @Mapping(target = "hubId", ignore = true)
    @Mapping(target = "airspaceZoneId", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "conflictType", ignore = true)
    @Mapping(target = "severity", expression = "java(postVm.severity() != null ? mapSeverityFromPost(postVm.severity()) : target.getSeverity())")
    @Mapping(target = "maxSeverity", expression = "java(resolveMaxSeverity(target.getMaxSeverity(), postVm.severity() != null ? mapSeverityFromPost(postVm.severity()) : target.getSeverity()))")
    @Mapping(target = "minSeparationDistance", expression = "java(resolveMinSeparation(target.getMinSeparationDistance(), postVm.separationDistance()))")
    @Mapping(target = "detectedAt", ignore = true)
    @Mapping(target = "detectionMethod", ignore = true)
    @Mapping(target = "resolutionStrategy", ignore = true)
    @Mapping(target = "resolutionActions", ignore = true)
    @Mapping(target = "resolvedAt", ignore = true)
    @Mapping(target = "resolvedBy", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    public abstract void updateEntityFromPostVm(@MappingTarget Conflict target, ConflictPostVm postVm);

    protected ConflictType mapConflictTypeFromPost(String type) {
        ConflictType parsed = ConflictType.fromValue(type);
        return parsed != null ? parsed : ConflictType.GEOFENCE_VIOLATION;
    }

    protected ConflictSeverity mapSeverityFromPost(String severity) {
        ConflictSeverity parsed = ConflictSeverity.fromValue(severity);
        return parsed != null ? parsed : ConflictSeverity.CRITICAL;
    }

    protected ConflictSeverity resolveMaxSeverity(ConflictSeverity current, ConflictSeverity incoming) {
        if (current == null) {
            return incoming;
        }
        if (incoming == null) {
            return current;
        }
        return incoming.ordinal() < current.ordinal() ? incoming : current;
    }

    protected Double resolveMinSeparation(Double current, Double incoming) {
        if (current == null) {
            return incoming;
        }
        if (incoming == null) {
            return current;
        }
        return Math.min(current, incoming);
    }

    @Named("trimBlankToNull")
    protected String trimBlankToNull(String value) {
        return (value != null && !value.isBlank()) ? value.trim() : null;
    }

    @Named("mapLocation")
    protected LocationVm mapLocation(Conflict entity) {
        if (entity == null || (entity.getLocationLat() == null && entity.getLocationLon() == null)) {
            return null;
        }
        return new LocationVm(entity.getLocationLat(), entity.getLocationLon());
    }

    @Named("mapResolutionActions")
    protected Map<String, Object> mapResolutionActions(Map<String, Object> actions) {
        return actions != null ? actions : Collections.emptyMap();
    }
}



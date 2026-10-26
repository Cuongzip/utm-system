package com.utm.conflict.mapper;

import com.utm.conflict.model.Conflict;
import com.utm.conflict.model.ConflictSnapshot;
import com.utm.conflict.model.enumeration.ConflictSeverity;
import com.utm.conflict.viewmodel.ConflictSnapshotVm;
import com.utm.conflict.viewmodel.LocationVm;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.List;

@Mapper(
        componentModel = "spring",
        builder = @org.mapstruct.Builder(disableBuilder = true)
)
public abstract class ConflictSnapshotMapper {

    @Mapping(target = "conflictId", source = "conflict.id")
    @Mapping(target = "primaryLocation", source = "entity", qualifiedByName = "mapPrimaryLocation")
    @Mapping(target = "secondaryLocation", source = "entity", qualifiedByName = "mapSecondaryLocation")
    public abstract ConflictSnapshotVm toVm(ConflictSnapshot entity);

    public abstract List<ConflictSnapshotVm> toVmList(List<ConflictSnapshot> entities);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "conflict", source = "conflict")
    @Mapping(target = "recordedAt", expression = "java(java.time.ZonedDateTime.now())")
    @Mapping(target = "primaryLat", source = "pLat")
    @Mapping(target = "primaryLon", source = "pLon")
    @Mapping(target = "primaryAlt", source = "pAlt")
    @Mapping(target = "secondaryLat", source = "sLat")
    @Mapping(target = "secondaryLon", source = "sLon")
    @Mapping(target = "secondaryAlt", source = "sAlt")
    @Mapping(target = "separationDistance", source = "distHoriz")
    @Mapping(target = "verticalSeparation", source = "distVert")
    @Mapping(target = "timeToConflictSec", source = "timeToConflict")
    @Mapping(target = "severity", source = "severity")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    public abstract ConflictSnapshot toEntity(
            Conflict conflict,
            Double pLat, Double pLon, Double pAlt,
            Double sLat, Double sLon, Double sAlt,
            Double distHoriz, Double distVert,
            Integer timeToConflict,
            ConflictSeverity severity
    );

    @Named("mapPrimaryLocation")
    protected LocationVm mapPrimaryLocation(ConflictSnapshot entity) {
        if (entity == null || (entity.getPrimaryLat() == null && entity.getPrimaryLon() == null)) {
            return null;
        }
        return new LocationVm(entity.getPrimaryLat(), entity.getPrimaryLon());
    }

    @Named("mapSecondaryLocation")
    protected LocationVm mapSecondaryLocation(ConflictSnapshot entity) {
        if (entity == null || (entity.getSecondaryLat() == null && entity.getSecondaryLon() == null)) {
            return null;
        }
        return new LocationVm(entity.getSecondaryLat(), entity.getSecondaryLon());
    }
}

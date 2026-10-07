package com.utm.conflict.mapper;

import com.utm.conflict.model.Conflict;
import com.utm.conflict.model.enumeration.ConflictSeverity;
import com.utm.conflict.model.enumeration.ConflictType;
import com.utm.conflict.viewmodel.ConflictScanResultVm;
import com.utm.conflict.viewmodel.FlightClientVm;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

import java.time.ZonedDateTime;

@Mapper(
        componentModel = "spring",
        builder = @org.mapstruct.Builder(disableBuilder = true)
)
public interface ConflictDetectionMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "primaryFlightId", source = "primaryFlight.id")
    @Mapping(target = "secondaryFlightId", source = "secondaryFlight.id")
    @Mapping(target = "conflictType", source = "conflictType")
    @Mapping(target = "severity", source = "severity")
    @Mapping(target = "status", expression = "java(com.utm.conflict.model.enumeration.ConflictStatus.DETECTED)")
    @Mapping(target = "hubId", source = "hubId")
    @Mapping(target = "detectedAt", expression = "java(java.time.ZonedDateTime.now())")
    @Mapping(target = "detectionMethod", constant = "automated_telemetry")
    @Mapping(target = "locationLat", source = "midLat")
    @Mapping(target = "locationLon", source = "midLon")
    @Mapping(target = "altitude", source = "midAlt")
    @Mapping(target = "separationDistance", source = "distHoriz")
    @Mapping(target = "verticalSeparation", source = "distVert")
    @Mapping(target = "timeToConflictSec", source = "timeToConflict")
    @Mapping(target = "description", expression = "java(String.format(\"Loss of separation between flight %s and %s (horiz: %.1fm, vert: %.1fm)\", primaryFlight != null ? primaryFlight.flightNumber() : \"unknown\", secondaryFlight != null ? secondaryFlight.flightNumber() : \"unknown\", distHoriz, distVert))")
    @Mapping(target = "resolutionStrategy", ignore = true)
    @Mapping(target = "resolutionActions", ignore = true)
    @Mapping(target = "resolvedAt", ignore = true)
    @Mapping(target = "resolvedBy", ignore = true)
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    Conflict toEntity(
            FlightClientVm primaryFlight,
            FlightClientVm secondaryFlight,
            ConflictType conflictType,
            ConflictSeverity severity,
            String hubId,
            Double midLat,
            Double midLon,
            Double midAlt,
            Double distHoriz,
            Double distVert,
            Integer timeToConflict
    );

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "primaryFlightId", ignore = true)
    @Mapping(target = "secondaryFlightId", ignore = true)
    @Mapping(target = "hubId", ignore = true)
    @Mapping(target = "detectedAt", ignore = true)
    @Mapping(target = "detectionMethod", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "conflictType", ignore = true)
    @Mapping(target = "description", ignore = true)
    @Mapping(target = "resolutionStrategy", ignore = true)
    @Mapping(target = "resolutionActions", ignore = true)
    @Mapping(target = "resolvedAt", ignore = true)
    @Mapping(target = "resolvedBy", ignore = true)
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    @Mapping(target = "separationDistance", expression = "java(Math.min(target.getSeparationDistance(), distHoriz))")
    @Mapping(target = "verticalSeparation", source = "distVert")
    @Mapping(target = "locationLat", source = "midLat")
    @Mapping(target = "locationLon", source = "midLon")
    @Mapping(target = "altitude", source = "midAlt")
    @Mapping(target = "timeToConflictSec", source = "timeToConflict")
    @Mapping(target = "severity", source = "severity")
    void updateSeparation(
            @MappingTarget Conflict target,
            Double midLat,
            Double midLon,
            Double midAlt,
            Double distHoriz,
            Double distVert,
            Integer timeToConflict,
            ConflictSeverity severity
    );

    @Mapping(target = "status", expression = "java(com.utm.conflict.model.enumeration.ConflictStatus.RESOLVED)")
    @Mapping(target = "resolutionStrategy", expression = "java(com.utm.conflict.model.enumeration.ResolutionStrategy.AUTO_CLEARED)")
    @Mapping(target = "resolvedAt", expression = "java(java.time.ZonedDateTime.now())")
    @Mapping(target = "resolvedBy", source = "resolvedBy")
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "primaryFlightId", ignore = true)
    @Mapping(target = "secondaryFlightId", ignore = true)
    @Mapping(target = "hubId", ignore = true)
    @Mapping(target = "conflictType", ignore = true)
    @Mapping(target = "severity", ignore = true)
    @Mapping(target = "detectedAt", ignore = true)
    @Mapping(target = "detectionMethod", ignore = true)
    @Mapping(target = "locationLat", ignore = true)
    @Mapping(target = "locationLon", ignore = true)
    @Mapping(target = "altitude", ignore = true)
    @Mapping(target = "separationDistance", ignore = true)
    @Mapping(target = "verticalSeparation", ignore = true)
    @Mapping(target = "timeToConflictSec", ignore = true)
    @Mapping(target = "description", ignore = true)
    @Mapping(target = "resolutionActions", ignore = true)
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    void resolveConflictAuto(@MappingTarget Conflict target, String resolvedBy);

    @Mapping(target = "scannedAt", expression = "java(scannedAt != null ? scannedAt : java.time.ZonedDateTime.now())")
    ConflictScanResultVm toScanResultVm(
            int activeFlightsCount,
            int evaluatedPairsCount,
            int newConflictsDetected,
            int existingConflictsUpdated,
            int resolvedConflictsCount,
            ZonedDateTime scannedAt
    );
}

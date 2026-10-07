package com.utm.flight.mapper;

import com.utm.flight.model.FlightConformance;
import com.utm.flight.model.enumeration.ConformanceStatus;
import com.utm.flight.viewmodel.FlightConformanceVm;
import com.utm.flight.viewmodel.TelemetryRecordVm;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(
        componentModel = "spring",
        builder = @org.mapstruct.Builder(disableBuilder = true)
)
public interface FlightConformanceMapper {

    @Mapping(target = "flightId", source = "flight.id")
    @Mapping(target = "status", source = "status", qualifiedByName = "mapStatusToString")
    FlightConformanceVm toVm(FlightConformance entity);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "currentLatitude", source = "latitude")
    @Mapping(target = "currentLongitude", source = "longitude")
    @Mapping(target = "currentAltitude", source = "altitude")
    @Mapping(target = "currentSpeed", source = "speed")
    @Mapping(target = "currentHeading", source = "heading")
    @Mapping(target = "lastTelemetryTime", expression = "java(telemetry.getEffectiveTimestamp())")
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "flight", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "crossTrackErrorM", ignore = true)
    @Mapping(target = "verticalErrorM", ignore = true)
    @Mapping(target = "corridorRadiusM", ignore = true)
    @Mapping(target = "altitudeBufferM", ignore = true)
    @Mapping(target = "lastEvaluatedAt", ignore = true)
    @Mapping(target = "violationsJson", ignore = true)
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    void updateFromTelemetry(@MappingTarget FlightConformance entity, TelemetryRecordVm telemetry);

    @Named("mapStatusToString")
    default String mapStatusToString(ConformanceStatus status) {
        return status != null ? status.getValue() : null;
    }
}

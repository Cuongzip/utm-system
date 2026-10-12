package com.utm.flight.mapper;

import com.utm.flight.model.Flight;
import com.utm.flight.model.FlightConformance;
import com.utm.flight.model.enumeration.ConformanceStatus;
import com.utm.flight.viewmodel.FlightConformanceVm;
import com.utm.flight.viewmodel.TelemetryBriefVm;
import org.mapstruct.BeanMapping;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(
        componentModel = MappingConstants.ComponentModel.SPRING,
        builder = @Builder(disableBuilder = true)
)
public interface FlightConformanceMapper {

    @Mapping(target = "flightId", source = "flight.id")
    @Mapping(target = "status", source = "status", qualifiedByName = "mapStatusToString")
    FlightConformanceVm toVm(FlightConformance entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "flight", source = "flight")
    @Mapping(target = "status", expression = "java(flight.getStatus() == com.utm.flight.model.enumeration.FlightStatus.ACTIVE ? com.utm.flight.model.enumeration.ConformanceStatus.UNKNOWN : com.utm.flight.model.enumeration.ConformanceStatus.CONFORMANT)")
    @Mapping(target = "corridorRadiusM", constant = "15.0")
    @Mapping(target = "altitudeBufferM", constant = "10.0")
    @Mapping(target = "crossTrackErrorM", ignore = true)
    @Mapping(target = "verticalErrorM", ignore = true)
    @Mapping(target = "currentLatitude", ignore = true)
    @Mapping(target = "currentLongitude", ignore = true)
    @Mapping(target = "currentAltitude", ignore = true)
    @Mapping(target = "currentSpeed", ignore = true)
    @Mapping(target = "currentHeading", ignore = true)
    @Mapping(target = "lastTelemetryTime", ignore = true)
    @Mapping(target = "lastEvaluatedAt", expression = "java(java.time.ZonedDateTime.now())")
    @Mapping(target = "violationsJson", ignore = true)
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    FlightConformance toEntity(Flight flight);

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
    void updateFromTelemetry(@MappingTarget FlightConformance entity, TelemetryBriefVm telemetry);

    @Named("mapStatusToString")
    default String mapStatusToString(ConformanceStatus status) {
        return status != null ? status.getValue() : null;
    }
}

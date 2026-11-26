package com.utm.telemetry.mapper;

import com.utm.telemetry.model.TelemetryRecord;
import com.utm.telemetry.viewmodel.telemetry.TelemetryIngestVm;
import com.utm.telemetry.viewmodel.telemetry.TelemetryRecordVm;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(
        componentModel = MappingConstants.ComponentModel.SPRING,
        builder = @Builder(disableBuilder = true),
        unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface TelemetryMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "droneId", source = "droneId", qualifiedByName = "trimBlankToNull")
    @Mapping(target = "flightId", source = "flightId", qualifiedByName = "trimBlankToNull")
    @Mapping(target = "flightMode", source = "flightMode", qualifiedByName = "trimBlankToNull")
    @Mapping(target = "systemStatus", source = "systemStatus", qualifiedByName = "trimBlankToNull")
    @Mapping(target = "source", source = "source", qualifiedByName = "trimBlankToNull")
    @Mapping(target = "recordedAt", expression = "java(vm.recordedAt() != null ? vm.recordedAt() : java.time.ZonedDateTime.now())")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    TelemetryRecord toEntity(TelemetryIngestVm vm);

    @Mapping(target = "timestamp", expression = "java(entity.getRecordedAt() != null ? entity.getRecordedAt() : (entity.getCreatedOn() != null ? entity.getCreatedOn() : java.time.ZonedDateTime.now()))")
    TelemetryRecordVm toVm(TelemetryRecord entity);

    List<TelemetryRecordVm> toVmList(List<TelemetryRecord> entities);

    @Named("trimBlankToNull")
    default String trimBlankToNull(String value) {
        return (value != null && !value.isBlank()) ? value.trim() : null;
    }
}

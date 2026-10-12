package com.utm.telemetry.mapper;

import com.utm.telemetry.model.TelemetryRecord;
import com.utm.telemetry.viewmodel.TelemetryIngestVm;
import com.utm.telemetry.viewmodel.TelemetryRecordVm;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(
        componentModel = "spring",
        builder = @org.mapstruct.Builder(disableBuilder = true)
)
public interface TelemetryMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    TelemetryRecord toEntity(TelemetryIngestVm vm);

    @Mapping(target = "timestamp", expression = "java(entity.getCreatedOn() != null ? entity.getCreatedOn() : java.time.ZonedDateTime.now())")
    TelemetryRecordVm toVm(TelemetryRecord entity);
}

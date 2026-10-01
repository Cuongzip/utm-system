package com.utm.telemetry.mapper;

import com.utm.telemetry.model.TelemetryRecord;
import com.utm.telemetry.viewmodel.TelemetryIngestVm;
import com.utm.telemetry.viewmodel.TelemetryRecordVm;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface TelemetryMapper {

    @Mapping(target = "id", ignore = true)
    TelemetryRecord toEntity(TelemetryIngestVm vm);

    @Mapping(target = "timestamp", source = "createdOn")
    TelemetryRecordVm toVm(TelemetryRecord entity);
}

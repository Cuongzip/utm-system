package com.utm.flight.mapper;

import com.utm.flight.model.FlightConformance;
import com.utm.flight.model.FlightConformanceAlert;
import com.utm.flight.model.enumeration.ConformanceStatus;
import com.utm.flight.viewmodel.FlightConformanceAlertVm;
import com.utm.flight.viewmodel.FlightConformanceVm;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

@Mapper(
        componentModel = "spring",
        builder = @org.mapstruct.Builder(disableBuilder = true)
)
public interface FlightConformanceMapper {

    @Mapping(target = "flightId", source = "flight.id")
    @Mapping(target = "status", source = "status", qualifiedByName = "mapStatusToString")
    FlightConformanceVm toVm(FlightConformance entity);

    @Mapping(target = "flightId", source = "flight.id")
    FlightConformanceAlertVm toVm(FlightConformanceAlert entity);

    @Named("mapStatusToString")
    default String mapStatusToString(ConformanceStatus status) {
        return status != null ? status.getValue() : null;
    }
}

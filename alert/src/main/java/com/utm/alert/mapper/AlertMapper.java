package com.utm.alert.mapper;

import com.utm.alert.model.Alert;
import com.utm.alert.model.enumeration.AlertType;
import com.utm.alert.viewmodel.alert.AlertPostVm;
import com.utm.alert.viewmodel.alert.AlertVm;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.List;

@Mapper(
        componentModel = "spring",
        builder = @Builder(disableBuilder = true)
)
public interface AlertMapper {

    AlertVm toVm(Alert entity);

    List<AlertVm> toVmList(List<Alert> entities);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "alertType", source = "alertType", qualifiedByName = "mapAlertType")
    @Mapping(target = "droneId", source = "droneId", qualifiedByName = "trimBlankToNull")
    @Mapping(target = "flightId", source = "flightId", qualifiedByName = "trimBlankToNull")
    @Mapping(target = "hubId", source = "hubId", qualifiedByName = "trimBlankToNull")
    @Mapping(target = "conflictId", source = "conflictId", qualifiedByName = "trimBlankToNull")
    @Mapping(target = "incidentId", source = "incidentId", qualifiedByName = "trimBlankToNull")
    @Mapping(target = "severity", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "acknowledgedAt", ignore = true)
    @Mapping(target = "acknowledgedBy", ignore = true)
    @Mapping(target = "resolvedAt", ignore = true)
    @Mapping(target = "resolvedBy", ignore = true)
    @Mapping(target = "resolutionNotes", ignore = true)
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    Alert toEntity(AlertPostVm postVm);

    @Named("mapAlertType")
    default AlertType mapAlertType(String value) {
        return AlertType.fromValue(value);
    }

    @Named("trimBlankToNull")
    default String trimBlankToNull(String value) {
        return (value != null && !value.isBlank()) ? value.trim() : null;
    }
}


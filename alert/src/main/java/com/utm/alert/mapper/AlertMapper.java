package com.utm.alert.mapper;

import com.utm.alert.model.Alert;
import com.utm.alert.viewmodel.AlertPostVm;
import com.utm.alert.viewmodel.AlertVm;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(
        componentModel = "spring",
        builder = @Builder(disableBuilder = true)
)
public interface AlertMapper {

    @Mapping(target = "severity", expression = "java(entity.getSeverity() != null ? entity.getSeverity().getValue() : null)")
    @Mapping(target = "status", expression = "java(entity.getStatus() != null ? entity.getStatus().getValue() : null)")
    AlertVm toVm(Alert entity);

    List<AlertVm> toVmList(List<Alert> entities);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "severity", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "acknowledged", ignore = true)
    @Mapping(target = "acknowledgedAt", ignore = true)
    @Mapping(target = "acknowledgedBy", ignore = true)
    @Mapping(target = "resolved", ignore = true)
    @Mapping(target = "resolvedAt", ignore = true)
    @Mapping(target = "resolvedBy", ignore = true)
    @Mapping(target = "resolutionNotes", ignore = true)
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    Alert toEntity(AlertPostVm postVm);
}

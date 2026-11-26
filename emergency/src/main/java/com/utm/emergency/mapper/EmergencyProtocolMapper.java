package com.utm.emergency.mapper;

import com.utm.emergency.model.EmergencyProtocol;
import com.utm.emergency.viewmodel.protocol.EmergencyProtocolPostVm;
import com.utm.emergency.viewmodel.protocol.EmergencyProtocolPutVm;
import com.utm.emergency.viewmodel.protocol.EmergencyProtocolVm;
import org.mapstruct.BeanMapping;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(
        componentModel = MappingConstants.ComponentModel.SPRING,
        builder = @Builder(disableBuilder = true),
        unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface EmergencyProtocolMapper {

    @Mapping(target = "isActive", source = "active")
    @Mapping(target = "isSystemDefault", source = "systemDefault")
    EmergencyProtocolVm toVm(EmergencyProtocol entity);

    List<EmergencyProtocolVm> toVmList(List<EmergencyProtocol> entities);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "name", qualifiedByName = "trimString")
    @Mapping(target = "systemDefault", constant = "false")
    @Mapping(target = "active", source = "isActive", defaultValue = "true")
    @Mapping(target = "requiresConfirmation", source = "requiresConfirmation", defaultValue = "true")
    @Mapping(target = "confirmationTimeoutSeconds", source = "confirmationTimeoutSeconds", defaultValue = "30")
    @Mapping(target = "autoExecuteOnTimeout", source = "autoExecuteOnTimeout", defaultValue = "true")
    @Mapping(target = "priority", source = "priority", defaultValue = "50")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    EmergencyProtocol toEntity(EmergencyProtocolPostVm postVm);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "name", qualifiedByName = "trimString")
    @Mapping(target = "systemDefault", ignore = true)
    @Mapping(target = "active", source = "isActive")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    void updateEntityFromPutVm(@MappingTarget EmergencyProtocol entity, EmergencyProtocolPutVm putVm);

    @Named("trimString")
    default String trimString(String value) {
        return value != null ? value.trim() : null;
    }
}

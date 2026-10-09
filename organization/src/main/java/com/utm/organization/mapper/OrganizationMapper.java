package com.utm.organization.mapper;

import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.organization.model.Organization;
import com.utm.organization.model.enumeration.OrganizationStatus;
import com.utm.organization.model.enumeration.OrganizationType;
import com.utm.organization.viewmodel.OrganizationPostVm;
import com.utm.organization.viewmodel.OrganizationPutVm;
import com.utm.organization.viewmodel.OrganizationVm;
import org.mapstruct.BeanMapping;
import org.mapstruct.BeforeMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(
        componentModel = "spring",
        builder = @org.mapstruct.Builder(disableBuilder = true)
)
public interface OrganizationMapper {

    @Mapping(target = "status", source = "status", qualifiedByName = "mapStatusToString")
    @Mapping(target = "type", source = "type", qualifiedByName = "mapTypeToString")
    OrganizationVm toVm(Organization organization);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", constant = "ACTIVE")
    @Mapping(target = "name", qualifiedByName = "trimString")
    @Mapping(target = "registrationNumber", qualifiedByName = "trimString")
    @Mapping(target = "contactInfo", qualifiedByName = "trimString")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    Organization toEntity(OrganizationPostVm organizationPostVm);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "registrationNumber", ignore = true)
    @Mapping(target = "name", qualifiedByName = "trimString")
    @Mapping(target = "contactInfo", qualifiedByName = "trimString")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    void updateEntityFromPutVm(@MappingTarget Organization organization, OrganizationPutVm organizationPutVm);

    @BeforeMapping
    default void validatePostVm(OrganizationPostVm postVm) {
        if (postVm == null) {
            throw new BadRequestException("Request body cannot be null");
        }
        if (postVm.name() == null || postVm.name().trim().isBlank()) {
            throw new BadRequestException("Organization name is required");
        }
        if (postVm.type() == null) {
            throw new BadRequestException("Organization type is required");
        }
        if (postVm.registrationNumber() == null || postVm.registrationNumber().trim().isBlank()) {
            throw new BadRequestException("Registration number is required");
        }
    }

    @BeforeMapping
    default void validatePutVm(OrganizationPutVm putVm, @MappingTarget Organization target) {
        if (putVm == null) {
            throw new BadRequestException("Request body cannot be null");
        }
        if (putVm.name() != null && putVm.name().trim().isBlank()) {
            throw new BadRequestException("Organization name cannot be blank");
        }
    }

    @Named("mapStatusToString")
    default String mapStatusToString(OrganizationStatus status) {
        return status != null ? status.getValue() : null;
    }

    @Named("mapTypeToString")
    default String mapTypeToString(OrganizationType type) {
        return type != null ? type.getValue() : null;
    }

    @Named("trimString")
    default String trimString(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}


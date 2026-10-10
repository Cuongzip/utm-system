package com.utm.hub.mapper;

import com.utm.hub.model.Hub;
import com.utm.hub.model.enumeration.HubStatus;
import com.utm.hub.viewmodel.HubPostVm;
import com.utm.hub.viewmodel.HubPutVm;
import com.utm.hub.viewmodel.HubVm;
import com.utm.hub.viewmodel.LocationVm;
import com.utm.commonlibrary.exception.BadRequestException;
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
public interface HubMapper {

    @Mapping(target = "status", source = "status", qualifiedByName = "mapStatusToString")
    @Mapping(target = "location", expression = "java(new LocationVm(hub.getLatitude(), hub.getLongitude()))")
    @Mapping(target = "availableDronesCount", ignore = true)
    @Mapping(target = "corridors", ignore = true)
    HubVm toVm(Hub hub);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", constant = "ACTIVE")
    @Mapping(target = "name", qualifiedByName = "trimString")
    @Mapping(target = "code", qualifiedByName = "trimString")
    @Mapping(target = "latitude", expression = "java(hubPostVm.location().lat())")
    @Mapping(target = "longitude", expression = "java(hubPostVm.location().lng())")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    Hub toEntity(HubPostVm hubPostVm);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "code", ignore = true)
    @Mapping(target = "latitude", ignore = true)
    @Mapping(target = "longitude", ignore = true)
    @Mapping(target = "name", qualifiedByName = "trimString")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    void updateEntityFromPutVm(@MappingTarget Hub hub, HubPutVm hubPutVm);

    @BeforeMapping
    default void validatePostVm(HubPostVm postVm) {
        if (postVm == null) {
            throw new BadRequestException("Request body cannot be null");
        }
        if (postVm.code() == null || postVm.code().trim().isBlank()) {
            throw new BadRequestException("Hub code is required");
        }
        if (postVm.name() == null || postVm.name().trim().isBlank()) {
            throw new BadRequestException("Hub name is required");
        }
        if (postVm.location() == null || postVm.location().lat() == null || postVm.location().lng() == null) {
            throw new BadRequestException("Hub GPS location (lat, lng) is required");
        }
        if (postVm.location().lat() < -90.0 || postVm.location().lat() > 90.0) {
            throw new BadRequestException("Latitude must be between -90 and 90");
        }
        if (postVm.location().lng() < -180.0 || postVm.location().lng() > 180.0) {
            throw new BadRequestException("Longitude must be between -180 and 180");
        }
        if (postVm.altitudeMsl() == null || postVm.altitudeMsl() < 0) {
            throw new BadRequestException("Altitude MSL must be greater than or equal to 0");
        }
        if (postVm.airspaceRadius() == null || postVm.airspaceRadius() <= 0) {
            throw new BadRequestException("Airspace radius must be greater than 0");
        }
    }

    @BeforeMapping
    default void validatePutVm(HubPutVm putVm, @MappingTarget Hub target) {
        if (putVm == null) {
            throw new BadRequestException("Request body cannot be null");
        }
        if (putVm.name() != null && putVm.name().trim().isBlank()) {
            throw new BadRequestException("Hub name cannot be blank");
        }
        if (putVm.altitudeMsl() != null && putVm.altitudeMsl() < 0) {
            throw new BadRequestException("Altitude MSL must be greater than or equal to 0");
        }
        if (putVm.airspaceRadius() != null && putVm.airspaceRadius() <= 0) {
            throw new BadRequestException("Airspace radius must be greater than 0");
        }
    }

    @Named("mapStatusToString")
    default String mapStatusToString(HubStatus status) {
        return status != null ? status.getValue() : null;
    }

    @Named("trimString")
    default String trimString(String value) {
        return value != null ? value.trim() : null;
    }
}

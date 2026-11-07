package com.utm.hub.mapper;

import com.utm.hub.model.Hub;
import com.utm.hub.model.Location;
import com.utm.hub.viewmodel.hub.HubPostVm;
import com.utm.hub.viewmodel.hub.HubPutVm;
import com.utm.hub.viewmodel.hub.HubVm;
import com.utm.hub.viewmodel.hub.LocationVm;
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
public interface HubMapper {

    HubVm toVm(Hub hub);

    List<HubVm> toVmList(List<Hub> hubs);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", constant = "ACTIVE")
    @Mapping(target = "name", qualifiedByName = "trimString")
    @Mapping(target = "code", qualifiedByName = "trimString")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    Hub toEntity(HubPostVm hubPostVm);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "code", ignore = true)
    @Mapping(target = "name", qualifiedByName = "trimString")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    void updateEntityFromPutVm(@MappingTarget Hub hub, HubPutVm hubPutVm);

    LocationVm toLocationVm(Location location);

    Location toLocation(LocationVm locationVm);

    @Named("trimString")
    default String trimString(String value) {
        return value != null ? value.trim() : null;
    }
}

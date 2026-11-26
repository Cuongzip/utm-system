package com.utm.airspace.mapper;

import com.utm.airspace.model.AirspaceZone;
import com.utm.airspace.model.GeoJsonPolygon;
import com.utm.airspace.viewmodel.zone.AirspaceZonePostVm;
import com.utm.airspace.viewmodel.zone.AirspaceZonePutVm;
import com.utm.airspace.viewmodel.zone.AirspaceZoneVm;
import com.utm.airspace.viewmodel.zone.GeoJsonPolygonVm;
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

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING, builder = @Builder(disableBuilder = true), unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface AirspaceZoneMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "hubId", qualifiedByName = "trimToNull")
    @Mapping(target = "altitudeFloor", defaultValue = "0.0")
    @Mapping(target = "altitudeCeiling", defaultValue = "120.0")
    @Mapping(target = "priority", defaultValue = "0")
    @Mapping(target = "geometry", source = "geometry", qualifiedByName = "toPolygonModel")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    AirspaceZone toEntity(AirspaceZonePostVm postVm);

    @Mapping(target = "geometry", source = "geometry", qualifiedByName = "toPolygonVm")
    AirspaceZoneVm toVm(AirspaceZone entity);

    List<AirspaceZoneVm> toVmList(List<AirspaceZone> entities);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "code", ignore = true)
    @Mapping(target = "hubId", qualifiedByName = "trimToNull")
    @Mapping(target = "geometry", source = "geometry", qualifiedByName = "toPolygonModel")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    void updateEntityFromPutVm(AirspaceZonePutVm putVm, @MappingTarget AirspaceZone entity);

    @Named("toPolygonModel")
    default GeoJsonPolygon toPolygonModel(GeoJsonPolygonVm polygonVm) {
        if (polygonVm == null) {
            return null;
        }
        return new GeoJsonPolygon(polygonVm.type(), polygonVm.coordinates());
    }

    @Named("toPolygonVm")
    default GeoJsonPolygonVm toPolygonVm(GeoJsonPolygon polygon) {
        if (polygon == null) {
            return null;
        }
        return new GeoJsonPolygonVm(polygon.type(), polygon.coordinates());
    }

    @Named("trimToNull")
    default String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

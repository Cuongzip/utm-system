package com.utm.airspace.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.airspace.model.AirspaceZone;
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

    ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "geometry", source = "geometry", qualifiedByName = "geoJsonToString")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    AirspaceZone toEntity(AirspaceZonePostVm postVm);

    @Mapping(target = "geometry", source = "geometry", qualifiedByName = "stringToGeoJson")
    AirspaceZoneVm toVm(AirspaceZone entity);

    List<AirspaceZoneVm> toVmList(List<AirspaceZone> entities);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "code", ignore = true)
    @Mapping(target = "geometry", source = "geometry", qualifiedByName = "geoJsonToString")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    void updateEntityFromPutVm(AirspaceZonePutVm putVm, @MappingTarget AirspaceZone entity);

    @Named("geoJsonToString")
    default String geoJsonToString(GeoJsonPolygonVm polygonVm) {
        if (polygonVm == null) {
            return null;
        }
        try {
            return OBJECT_MAPPER.writeValueAsString(polygonVm);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to serialize GeoJSON geometry", e);
        }
    }

    @Named("stringToGeoJson")
    default GeoJsonPolygonVm stringToGeoJson(String geometryJson) {
        if (geometryJson == null || geometryJson.isBlank()) {
            return null;
        }
        try {
            return OBJECT_MAPPER.readValue(geometryJson, GeoJsonPolygonVm.class);
        } catch (JsonProcessingException e) {
            return null;
        }
    }
}

package com.utm.airspace.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.airspace.model.AirspaceZone;
import com.utm.airspace.viewmodel.AirspaceZonePostVm;
import com.utm.airspace.viewmodel.AirspaceZonePutVm;
import com.utm.airspace.viewmodel.AirspaceZoneVm;
import com.utm.airspace.viewmodel.GeoJsonPolygonVm;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(
        componentModel = "spring",
        builder = @org.mapstruct.Builder(disableBuilder = true)
)
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

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
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
        } catch (Exception e) {
            try {
                com.fasterxml.jackson.databind.JsonNode root = OBJECT_MAPPER.readTree(geometryJson);
                String type = root.path("type").asText("Polygon");
                if ("LineString".equalsIgnoreCase(type)) {
                    java.util.List<java.util.List<Double>> points = new java.util.ArrayList<>();
                    for (com.fasterxml.jackson.databind.JsonNode pt : root.path("coordinates")) {
                        if (pt.isArray() && pt.size() >= 2) {
                            points.add(java.util.List.of(pt.get(0).asDouble(), pt.get(1).asDouble()));
                        }
                    }
                    if (!points.isEmpty()) {
                        if (!points.get(0).equals(points.get(points.size() - 1))) {
                            points.add(points.get(0));
                        }
                        return new GeoJsonPolygonVm("Polygon", java.util.List.of(points));
                    }
                }
            } catch (Exception ignored) {
            }
            return null;
        }
    }
}

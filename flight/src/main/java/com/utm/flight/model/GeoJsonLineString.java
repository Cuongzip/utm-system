package com.utm.flight.model;

import java.util.List;

public record GeoJsonLineString(
        String type,
        List<List<Double>> coordinates
) {
    public static GeoJsonLineString empty() {
        return new GeoJsonLineString("LineString", List.of());
    }

    public static GeoJsonLineString of(List<List<Double>> coordinates) {
        return new GeoJsonLineString("LineString", coordinates != null ? coordinates : List.of());
    }
}

package com.utm.airspace.model;

import java.util.List;

public record GeoJsonPolygon(
        String type,
        List<List<List<Double>>> coordinates
) {
}

package com.utm.airspace.service;

import com.utm.airspace.viewmodel.check.AirspaceCheckPointVm;
import com.utm.airspace.viewmodel.zone.GeoJsonPolygonVm;
import com.utm.commonlibrary.exception.BadRequestException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Unit Tests: SpatialCalculationService (Geometry & Sampling)")
class SpatialCalculationServiceTest {

    private final SpatialCalculationService spatialCalculationService = new SpatialCalculationService();

    private GeoJsonPolygonVm createSquarePolygon(double minLon, double maxLon, double minLat, double maxLat) {
        return new GeoJsonPolygonVm("Polygon", List.of(List.of(
                List.of(minLon, minLat),
                List.of(maxLon, minLat),
                List.of(maxLon, maxLat),
                List.of(minLon, maxLat),
                List.of(minLon, minLat))));
    }

    @Test
    @DisplayName("samplePolyline clamps non-positive spacingM safely to >= 1.0m")
    void samplePolyline_nonPositiveSpacing_clampsSafelyWithoutOverflow() {
        List<AirspaceCheckPointVm> pts = List.of(
                new AirspaceCheckPointVm(10.7700, 106.7000, 50.0),
                new AirspaceCheckPointVm(10.7701, 106.7000, 50.0));

        List<SpatialCalculationService.SampledPoint> zeroSpacing = spatialCalculationService.samplePolyline(pts, 0.0);
        List<SpatialCalculationService.SampledPoint> negativeSpacing = spatialCalculationService.samplePolyline(pts, -25.0);

        assertThat(zeroSpacing).isNotEmpty().hasSizeLessThan(50);
        assertThat(negativeSpacing).hasSameSizeAs(zeroSpacing);
    }

    @Test
    @DisplayName("doesSegmentIntersectPolygon detects narrow polygon crossing between segment endpoints")
    void doesSegmentIntersectPolygon_narrowZoneBetweenEndpoints_returnsTrue() {
        GeoJsonPolygonVm narrowZone = createSquarePolygon(106.7049, 106.7051, 10.7740, 10.7760);

        boolean intersects = spatialCalculationService.doesSegmentIntersectPolygon(
                10.7750, 106.7000,
                10.7750, 106.7100,
                narrowZone);

        boolean misses = spatialCalculationService.doesSegmentIntersectPolygon(
                10.7800, 106.7000,
                10.7800, 106.7100,
                narrowZone);

        assertThat(intersects).isTrue();
        assertThat(misses).isFalse();
    }

    @Test
    @DisplayName("isPointInPolygon excludes points located inside interior hole ring")
    void isPointInPolygon_pointInsideHole_returnsFalse() {
        GeoJsonPolygonVm polygonWithHole = new GeoJsonPolygonVm("Polygon", List.of(
                List.of(
                        List.of(106.69, 10.77),
                        List.of(106.71, 10.77),
                        List.of(106.71, 10.79),
                        List.of(106.69, 10.79),
                        List.of(106.69, 10.77)),
                List.of(
                        List.of(106.698, 10.778),
                        List.of(106.702, 10.778),
                        List.of(106.702, 10.782),
                        List.of(106.698, 10.782),
                        List.of(106.698, 10.778))));

        assertThat(spatialCalculationService.isPointInPolygon(10.775, 106.700, polygonWithHole)).isTrue();
        assertThat(spatialCalculationService.isPointInPolygon(10.780, 106.700, polygonWithHole)).isFalse();
    }

    @Test
    @DisplayName("validatePolygon rejects unclosed exterior rings")
    void validatePolygon_unclosedRing_throwsBadRequestException() {
        GeoJsonPolygonVm unclosed = new GeoJsonPolygonVm("Polygon", List.of(List.of(
                List.of(106.69, 10.77),
                List.of(106.70, 10.77),
                List.of(106.70, 10.78),
                List.of(106.69, 10.78))));

        assertThatThrownBy(() -> spatialCalculationService.validatePolygon(unclosed))
                .isInstanceOf(BadRequestException.class);
    }
}

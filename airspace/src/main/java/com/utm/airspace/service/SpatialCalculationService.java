package com.utm.airspace.service;

import com.utm.airspace.viewmodel.AirspaceCheckPointVm;
import com.utm.airspace.viewmodel.GeoJsonPolygonVm;
import com.utm.commonlibrary.exception.BadRequestException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class SpatialCalculationService {

    private static final double EARTH_RADIUS_METERS = 6371000.0;

    public void validatePolygon(GeoJsonPolygonVm geometry) {
        if (geometry == null) {
            throw new BadRequestException("Geometry cannot be null");
        }
        if (!"Polygon".equalsIgnoreCase(geometry.type())) {
            throw new BadRequestException("Geometry type must be 'Polygon'");
        }
        if (geometry.coordinates() == null || geometry.coordinates().isEmpty()) {
            throw new BadRequestException("Polygon coordinates cannot be empty");
        }

        List<List<Double>> exteriorRing = geometry.coordinates().getFirst();
        if (exteriorRing == null || exteriorRing.size() < 4) {
            throw new BadRequestException("Polygon exterior ring must contain at least 4 coordinate pairs (closed ring)");
        }

        List<Double> first = exteriorRing.getFirst();
        List<Double> last = exteriorRing.getLast();
        if (first.size() < 2 || last.size() < 2) {
            throw new BadRequestException("Coordinates must contain at least [longitude, latitude]");
        }

        double diffLon = Math.abs(first.get(0) - last.get(0));
        double diffLat = Math.abs(first.get(1) - last.get(1));
        if (diffLon > 1e-6 || diffLat > 1e-6) {
            throw new BadRequestException("Polygon ring must be closed (first coordinate must match last coordinate)");
        }
    }

    public boolean isPointInPolygon(double lat, double lon, GeoJsonPolygonVm geometry) {
        if (geometry == null || geometry.coordinates() == null || geometry.coordinates().isEmpty()) {
            return false;
        }

        List<List<Double>> exteriorRing = geometry.coordinates().getFirst();
        if (!isPointInPolygonRing(lat, lon, exteriorRing)) {
            return false;
        }

        for (int i = 1; i < geometry.coordinates().size(); i++) {
            List<List<Double>> holeRing = geometry.coordinates().get(i);
            if (isPointInPolygonRing(lat, lon, holeRing)) {
                return false;
            }
        }

        return true;
    }

    public boolean isPointInZone(double lat, double lon, double alt, GeoJsonPolygonVm geometry, double altitudeCeiling) {
        if (alt > altitudeCeiling) {
            return false;
        }
        return isPointInPolygon(lat, lon, geometry);
    }


    public boolean isPointInPolygonRing(double lat, double lon, List<List<Double>> ring) {
        if (ring == null || ring.size() < 3) {
            return false;
        }

        boolean inside = false;
        for (int i = 0, j = ring.size() - 1; i < ring.size(); j = i++) {
            List<Double> vi = ring.get(i);
            List<Double> vj = ring.get(j);

            if (vi.size() < 2 || vj.size() < 2) {
                continue;
            }

            double xi = vi.get(0); // lon
            double yi = vi.get(1); // lat
            double xj = vj.get(0); // lon
            double yj = vj.get(1); // lat

            boolean intersect = ((yi > lat) != (yj > lat))
                    && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
            if (intersect) {
                inside = !inside;
            }
        }

        return inside;
    }

    public double calculateDistanceMeters(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double rLat1 = Math.toRadians(lat1);
        double rLat2 = Math.toRadians(lat2);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS_METERS * c;
    }

    public List<SampledPoint> samplePolyline(List<AirspaceCheckPointVm> points, double spacingM) {
        List<SampledPoint> sampledPoints = new ArrayList<>();
        if (points == null || points.isEmpty()) {
            return sampledPoints;
        }

        double cumulativeDistance = 0.0;

        for (int i = 0; i < points.size() - 1; i++) {
            AirspaceCheckPointVm p1 = points.get(i);
            AirspaceCheckPointVm p2 = points.get(i + 1);

            double segDist = calculateDistanceMeters(p1.lat(), p1.lon(), p2.lat(), p2.lon());
            int steps = Math.max(1, (int) Math.ceil(segDist / spacingM));

            for (int step = 0; step < steps; step++) {
                double fraction = (double) step / steps;
                double lat = p1.lat() + fraction * (p2.lat() - p1.lat());
                double lon = p1.lon() + fraction * (p2.lon() - p1.lon());
                double alt = p1.alt() + fraction * (p2.alt() - p1.alt());
                double currentDist = cumulativeDistance + fraction * segDist;

                sampledPoints.add(new SampledPoint(lat, lon, alt, i, currentDist));
            }

            cumulativeDistance += segDist;
        }

        AirspaceCheckPointVm lastPoint = points.getLast();
        sampledPoints.add(new SampledPoint(lastPoint.lat(), lastPoint.lon(), lastPoint.alt(), points.size() - 1, cumulativeDistance));

        return sampledPoints;
    }

    public record SampledPoint(double lat, double lon, double alt, int segmentIndex, double distanceFromStartM) {}
}

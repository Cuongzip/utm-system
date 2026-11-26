package com.utm.airspace.service;

import com.utm.airspace.viewmodel.check.AirspaceCheckPointVm;
import com.utm.airspace.viewmodel.zone.GeoJsonPolygonVm;
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

        for (List<List<Double>> ring : geometry.coordinates()) {
            if (ring == null || ring.size() < 4) {
                throw new BadRequestException("Polygon ring must contain at least 4 coordinate pairs (closed ring)");
            }
            for (List<Double> coord : ring) {
                if (coord == null || coord.size() < 2 || coord.get(0) == null || coord.get(1) == null) {
                    throw new BadRequestException("Coordinates must contain at least [longitude, latitude]");
                }
                double lon = coord.get(0);
                double lat = coord.get(1);
                if (!Double.isFinite(lon) || !Double.isFinite(lat)
                        || lon < -180.0 || lon > 180.0 || lat < -90.0 || lat > 90.0) {
                    throw new BadRequestException("Polygon coordinates must be valid WGS84 [longitude, latitude] values");
                }
            }
            List<Double> ringFirst = ring.getFirst();
            List<Double> ringLast = ring.getLast();
            double diffLon = Math.abs(ringFirst.get(0) - ringLast.get(0));
            double diffLat = Math.abs(ringFirst.get(1) - ringLast.get(1));
            if (diffLon > 1e-6 || diffLat > 1e-6) {
                throw new BadRequestException("Polygon ring must be closed (first coordinate must match last coordinate)");
            }
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

        double safeSpacingM = Math.max(1.0, spacingM);
        double cumulativeDistance = 0.0;

        for (int i = 0; i < points.size() - 1; i++) {
            AirspaceCheckPointVm p1 = points.get(i);
            AirspaceCheckPointVm p2 = points.get(i + 1);

            double segDist = calculateDistanceMeters(p1.lat(), p1.lon(), p2.lat(), p2.lon());
            int steps = Math.max(1, (int) Math.ceil(segDist / safeSpacingM));

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

    public boolean doesSegmentIntersectPolygon(double lat1, double lon1, double lat2, double lon2,
            GeoJsonPolygonVm geometry) {
        if (geometry == null || geometry.coordinates() == null || geometry.coordinates().isEmpty()) {
            return false;
        }
        double midLat = (lat1 + lat2) / 2.0;
        double midLon = (lon1 + lon2) / 2.0;
        if (isPointInPolygon(lat1, lon1, geometry) || isPointInPolygon(lat2, lon2, geometry)
                || isPointInPolygon(midLat, midLon, geometry)) {
            return true;
        }

        List<List<Double>> exteriorRing = geometry.coordinates().getFirst();
        if (exteriorRing == null || exteriorRing.size() < 2) {
            return false;
        }
        for (int i = 0; i < exteriorRing.size() - 1; i++) {
            List<Double> v1 = exteriorRing.get(i);
            List<Double> v2 = exteriorRing.get(i + 1);
            if (v1.size() < 2 || v2.size() < 2) {
                continue;
            }
            if (doSegmentsIntersect(lon1, lat1, lon2, lat2, v1.get(0), v1.get(1), v2.get(0), v2.get(1))) {
                return true;
            }
        }
        return false;
    }

    private static boolean doSegmentsIntersect(double ax, double ay, double bx, double by,
            double cx, double cy, double dx, double dy) {
        int o1 = orientation(ax, ay, bx, by, cx, cy);
        int o2 = orientation(ax, ay, bx, by, dx, dy);
        int o3 = orientation(cx, cy, dx, dy, ax, ay);
        int o4 = orientation(cx, cy, dx, dy, bx, by);

        if (o1 != o2 && o3 != o4) {
            return true;
        }
        if (o1 == 0 && onSegment(ax, ay, cx, cy, bx, by)) {
            return true;
        }
        if (o2 == 0 && onSegment(ax, ay, dx, dy, bx, by)) {
            return true;
        }
        if (o3 == 0 && onSegment(cx, cy, ax, ay, dx, dy)) {
            return true;
        }
        return o4 == 0 && onSegment(cx, cy, bx, by, dx, dy);
    }

    private static int orientation(double px, double py, double qx, double qy, double rx, double ry) {
        double val = (qy - py) * (rx - qx) - (qx - px) * (ry - qy);
        if (Math.abs(val) <= 1e-12) {
            return 0;
        }
        return val > 0 ? 1 : 2;
    }

    private static boolean onSegment(double px, double py, double qx, double qy, double rx, double ry) {
        return qx <= Math.max(px, rx) + 1e-12 && qx >= Math.min(px, rx) - 1e-12
                && qy <= Math.max(py, ry) + 1e-12 && qy >= Math.min(py, ry) - 1e-12;
    }

    public record SampledPoint(double lat, double lon, double alt, int segmentIndex, double distanceFromStartM) {}
}

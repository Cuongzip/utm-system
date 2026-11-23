package com.utm.mission.util;

import com.utm.mission.model.Waypoint;

import java.util.List;

public final class GeoUtils {

    private static final double EARTH_RADIUS_METERS = 6371000.0;

    private GeoUtils() {
    }

    public static double haversine(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2.0) * Math.sin(dLon / 2.0);
        double c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
        return EARTH_RADIUS_METERS * c;
    }

    public static double calculateTotalDistance(List<Waypoint> waypoints) {
        if (waypoints == null || waypoints.size() < 2) {
            return 0.0;
        }
        double totalDistance = 0.0;
        for (int i = 0; i < waypoints.size() - 1; i++) {
            Waypoint w1 = waypoints.get(i);
            Waypoint w2 = waypoints.get(i + 1);
            if (w1.getLatitude() != null && w1.getLongitude() != null
                    && w2.getLatitude() != null && w2.getLongitude() != null) {
                totalDistance += haversine(w1.getLatitude(), w1.getLongitude(), w2.getLatitude(), w2.getLongitude());
            }
        }
        return Math.round(totalDistance * 100.0) / 100.0;
    }
}

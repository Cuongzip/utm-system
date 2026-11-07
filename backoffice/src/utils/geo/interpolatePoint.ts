import type { GeoPoint } from "./types";

export function interpolatePoint(p1: GeoPoint, p2: GeoPoint, fraction: number): GeoPoint {
    return {
        lat: Number((p1.lat + (p2.lat - p1.lat) * fraction).toFixed(6)),
        lng: Number((p1.lng + (p2.lng - p1.lng) * fraction).toFixed(6)),
    };
}

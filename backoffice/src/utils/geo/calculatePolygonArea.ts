import type { GeoPoint } from "./types";

const EARTH_RADIUS_M = 6371000;

export function calculatePolygonArea(points: GeoPoint[]): number {
    if (!points || points.length < 3) return 0;

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    let area = 0;
    const n = points.length;

    for (let i = 0; i < n; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % n];
        area += toRad(p2.lng - p1.lng) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
    }

    return Math.round(Math.abs((area * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2));
}

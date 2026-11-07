import type { GeoPoint } from "./types";
import { calculateDistance } from "./calculateDistance";

export function calculatePathDistance(points: GeoPoint[]): number {
    if (points.length < 2) return 0;
    let sum = 0;
    for (let i = 1; i < points.length; i++) {
        sum += calculateDistance(points[i - 1], points[i]);
    }
    return sum;
}

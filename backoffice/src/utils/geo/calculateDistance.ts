import type { GeoPoint } from "./types";

export function calculateDistance(
    lat1OrP1: number | GeoPoint,
    lon1OrP2: number | GeoPoint,
    lat2?: number,
    lon2?: number
): number {
    let lat1: number;
    let lon1: number;
    let lat2Val: number;
    let lon2Val: number;

    if (typeof lat1OrP1 === "object" && typeof lon1OrP2 === "object") {
        lat1 = lat1OrP1.lat;
        lon1 = lat1OrP1.lng;
        lat2Val = lon1OrP2.lat;
        lon2Val = lon1OrP2.lng;
    } else {
        lat1 = lat1OrP1 as number;
        lon1 = lon1OrP2 as number;
        lat2Val = lat2 ?? 0;
        lon2Val = lon2 ?? 0;
    }

    const R = 6371e3;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(lat2Val - lat1);
    const dLon = toRad(lon2Val - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2Val)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

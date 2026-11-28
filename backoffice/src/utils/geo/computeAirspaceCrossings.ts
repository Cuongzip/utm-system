import type { AirspaceZone } from "@/types";

export interface RouteDistanceSegment {
    point: {
        latitude: number;
        longitude: number;
        altitude: number;
    };
    distance: number;
}

export interface AirspaceCrossingBand {
    zoneId: string;
    zoneName: string;
    zoneType: string;
    startDistanceM: number;
    endDistanceM: number;
    floorM: number;
    ceilingM: number;
    isPenetrated: boolean;
}

interface XY {
    x: number;
    y: number;
}

function projectToLocalMeters(lat: number, lng: number, refLat: number, refLng: number): XY {
    const cosLat = Math.cos((refLat * Math.PI) / 180);
    return {
        x: (lng - refLng) * 111320 * cosLat,
        y: (lat - refLat) * 111320,
    };
}

function isPointInPolygon(pt: XY, ring: XY[]): boolean {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i].x;
        const yi = ring[i].y;
        const xj = ring[j].x;
        const yj = ring[j].y;

        const intersect =
            yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi || 1e-12) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
}

function segmentIntersectionT(p1: XY, p2: XY, q1: XY, q2: XY): number | null {
    const rX = p2.x - p1.x;
    const rY = p2.y - p1.y;
    const sX = q2.x - q1.x;
    const sY = q2.y - q1.y;

    const denom = rX * sY - rY * sX;
    if (Math.abs(denom) < 1e-9) return null;

    const qpX = q1.x - p1.x;
    const qpY = q1.y - p1.y;

    const t = (qpX * sY - qpY * sX) / denom;
    const u = (qpX * rY - qpY * rX) / denom;

    if (t >= -1e-6 && t <= 1 + 1e-6 && u >= -1e-6 && u <= 1 + 1e-6) {
        return Math.min(1, Math.max(0, t));
    }
    return null;
}

function doesSegmentOverlapAltitudeBand(
    altA: number,
    altB: number,
    floorM: number,
    ceilingM: number
): boolean {
    const minSegAlt = Math.min(altA, altB);
    const maxSegAlt = Math.max(altA, altB);
    return maxSegAlt >= floorM && minSegAlt <= ceilingM;
}

export function computeAirspaceCrossings(
    segments: RouteDistanceSegment[],
    zones: AirspaceZone[]
): AirspaceCrossingBand[] {
    if (!segments || segments.length < 2 || !zones || zones.length === 0) {
        return [];
    }

    const refLat = segments[0].point.latitude;
    const refLng = segments[0].point.longitude;

    const projectedRoute = segments.map((s) => ({
        xy: projectToLocalMeters(s.point.latitude, s.point.longitude, refLat, refLng),
        alt: s.point.altitude,
        dist: s.distance,
    }));

    const bands: AirspaceCrossingBand[] = [];

    for (const zone of zones) {
        const rawRing = zone.geometry?.coordinates?.[0];
        if (!Array.isArray(rawRing) || rawRing.length < 3) continue;

        const ringXY: XY[] = [];
        for (const coord of rawRing) {
            if (Array.isArray(coord) && coord.length >= 2) {
                const lng = Number(coord[0]);
                const lat = Number(coord[1]);
                if (Number.isFinite(lat) && Number.isFinite(lng)) {
                    ringXY.push(projectToLocalMeters(lat, lng, refLat, refLng));
                }
            }
        }

        if (
            ringXY.length > 1 &&
            Math.hypot(
                ringXY[0].x - ringXY[ringXY.length - 1].x,
                ringXY[0].y - ringXY[ringXY.length - 1].y
            ) < 0.05
        ) {
            ringXY.pop();
        }
        if (ringXY.length < 3) continue;

        const floorM = zone.altitudeFloor ?? 0;
        const ceilingM =
            zone.altitudeCeiling !== undefined && zone.altitudeCeiling > floorM
                ? zone.altitudeCeiling
                : floorM + 150;
        const zoneType = zone.zoneType ?? "warning";
        const zoneName = (zone.name || zone.code || "Airspace Zone").trim();

        let openBand: AirspaceCrossingBand | null = null;

        for (let i = 1; i < projectedRoute.length; i++) {
            const prev = projectedRoute[i - 1];
            const curr = projectedRoute[i];
            const segLen = curr.dist - prev.dist;
            if (segLen <= 0.1) continue;

            const tParams: number[] = [0, 1];
            for (let e = 0; e < ringXY.length; e++) {
                const q1 = ringXY[e];
                const q2 = ringXY[(e + 1) % ringXY.length];
                const hitT = segmentIntersectionT(prev.xy, curr.xy, q1, q2);
                if (hitT !== null) {
                    tParams.push(hitT);
                }
            }

            tParams.sort((a, b) => a - b);
            const uniqueT: number[] = [tParams[0]];
            for (let k = 1; k < tParams.length; k++) {
                if (tParams[k] - uniqueT[uniqueT.length - 1] > 1e-4) {
                    uniqueT.push(tParams[k]);
                }
            }

            for (let k = 0; k < uniqueT.length - 1; k++) {
                const t0 = uniqueT[k];
                const t1 = uniqueT[k + 1];
                const tMid = (t0 + t1) / 2;
                const midXY: XY = {
                    x: prev.xy.x + (curr.xy.x - prev.xy.x) * tMid,
                    y: prev.xy.y + (curr.xy.y - prev.xy.y) * tMid,
                };

                if (isPointInPolygon(midXY, ringXY)) {
                    const startD = prev.dist + segLen * t0;
                    const endD = prev.dist + segLen * t1;
                    const alt0 = prev.alt + (curr.alt - prev.alt) * t0;
                    const alt1 = prev.alt + (curr.alt - prev.alt) * t1;
                    const normalizedType = zoneType.toLowerCase();
                    const isPermissiveZone =
                        normalizedType === "hub_corridor" ||
                        normalizedType === "hub_zone" ||
                        normalizedType === "controlled";
                    const maxSegAlt = Math.max(alt0, alt1);
                    const minSegAlt = Math.min(alt0, alt1);
                    const isMidCorridorBelowFloor =
                        normalizedType === "hub_corridor" &&
                        floorM > 0 &&
                        minSegAlt < floorM &&
                        startD > 120 &&
                        endD < projectedRoute[projectedRoute.length - 1].dist - 120;
                    const penetrated = isPermissiveZone
                        ? maxSegAlt > ceilingM || isMidCorridorBelowFloor
                        : doesSegmentOverlapAltitudeBand(alt0, alt1, floorM, ceilingM);

                    if (openBand && Math.abs(openBand.endDistanceM - startD) <= 2) {
                        openBand.endDistanceM = endD;
                        openBand.isPenetrated = openBand.isPenetrated || penetrated;
                    } else {
                        if (openBand) bands.push(openBand);
                        openBand = {
                            zoneId: zone.id,
                            zoneName,
                            zoneType,
                            startDistanceM: startD,
                            endDistanceM: endD,
                            floorM,
                            ceilingM,
                            isPenetrated: penetrated,
                        };
                    }
                }
            }
        }

        if (openBand) {
            bands.push(openBand);
        }
    }

    return bands;
}

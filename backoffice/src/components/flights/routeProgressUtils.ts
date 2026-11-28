import type { LiveAltitudeProgress } from "@/components/map";
import {
    DRONE_PHYSICS_DEFAULTS,
    type Drone,
    type Flight,
    type Hub,
    type TelemetryRecord,
} from "@/types";
import { calculateDistance, isValidGeoPoint } from "@/utils";
import { isDuplicateCoord } from "@/utils/geo";

export interface RouteDistanceNode {
    lat: number;
    lng: number;
    cumDistM: number;
}

export interface LegEtaProgress {
    nextLabel: string;
    distToNextM: number;
    remainingM: number;
    progressPct: number;
    etaMinutes: number | null;
}

export function buildRouteDistanceNodes(
    flight: Flight,
    departureHub: Hub | null,
    arrivalHub: Hub | null
): RouteDistanceNode[] {
    const rawPts: Array<{ latitude: number; longitude: number }> = [];
    if (
        departureHub?.location?.latitude !== undefined &&
        departureHub?.location?.longitude !== undefined
    ) {
        rawPts.push({
            latitude: departureHub.location.latitude,
            longitude: departureHub.location.longitude,
        });
    }
    const sortedWps = [...(flight.waypoints ?? [])].sort(
        (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)
    );
    for (const wp of sortedWps) {
        if (wp.latitude === undefined || wp.longitude === undefined) continue;
        const prev = rawPts[rawPts.length - 1];
        if (!prev || !isDuplicateCoord(prev, { latitude: wp.latitude, longitude: wp.longitude })) {
            rawPts.push({ latitude: wp.latitude, longitude: wp.longitude });
        }
    }
    if (
        arrivalHub?.location?.latitude !== undefined &&
        arrivalHub?.location?.longitude !== undefined
    ) {
        const prev = rawPts[rawPts.length - 1];
        if (
            !prev ||
            !isDuplicateCoord(prev, {
                latitude: arrivalHub.location.latitude,
                longitude: arrivalHub.location.longitude,
            })
        ) {
            rawPts.push({
                latitude: arrivalHub.location.latitude,
                longitude: arrivalHub.location.longitude,
            });
        }
    }

    let cumDistM = 0;
    return rawPts.map((pt, idx) => {
        if (idx > 0) {
            cumDistM += calculateDistance(
                rawPts[idx - 1].latitude,
                rawPts[idx - 1].longitude,
                pt.latitude,
                pt.longitude
            );
        }
        return { lat: pt.latitude, lng: pt.longitude, cumDistM };
    });
}

export function projectAlongRouteDistanceM(
    lat: number,
    lng: number,
    nodes: RouteDistanceNode[]
): number {
    if (nodes.length === 0) return 0;
    if (nodes.length === 1) {
        return calculateDistance(nodes[0].lat, nodes[0].lng, lat, lng);
    }

    let bestCrossSq = Number.POSITIVE_INFINITY;
    let bestAlongM = 0;

    for (let i = 1; i < nodes.length; i++) {
        const a = nodes[i - 1];
        const b = nodes[i];
        const segLenM = b.cumDistM - a.cumDistM;
        const cosLat = Math.cos(((a.lat + b.lat) * 0.5 * Math.PI) / 180);
        const bx = (b.lng - a.lng) * 111320 * cosLat;
        const by = (b.lat - a.lat) * 111320;
        const px = (lng - a.lng) * 111320 * cosLat;
        const py = (lat - a.lat) * 111320;
        const denom = bx * bx + by * by;
        const t = denom > 0.01 ? Math.min(1, Math.max(0, (px * bx + py * by) / denom)) : 0;
        const projX = t * bx;
        const projY = t * by;
        const crossSq = (px - projX) * (px - projX) + (py - projY) * (py - projY);

        if (crossSq < bestCrossSq) {
            bestCrossSq = crossSq;
            bestAlongM = a.cumDistM + t * segLenM;
        }
    }

    return bestAlongM;
}

export function computeLiveAltitudeProgress(
    activeRecord: TelemetryRecord | null,
    timeline: TelemetryRecord[],
    visibleTrail: TelemetryRecord[],
    routeDistanceNodes: RouteDistanceNode[],
    isReplay: boolean
): LiveAltitudeProgress | null {
    if (!activeRecord || activeRecord.latitude == null || activeRecord.longitude == null) {
        return null;
    }
    const fallbackNodes: RouteDistanceNode[] =
        routeDistanceNodes.length > 0
            ? routeDistanceNodes
            : timeline[0]?.latitude != null && timeline[0]?.longitude != null
              ? [{ lat: timeline[0].latitude, lng: timeline[0].longitude, cumDistM: 0 }]
              : [];
    if (fallbackNodes.length === 0) return null;

    const trace = visibleTrail
        .filter((s) => s.latitude != null && s.longitude != null && s.altitude != null)
        .map((s) => ({
            distanceM: projectAlongRouteDistanceM(s.latitude!, s.longitude!, fallbackNodes),
            altitudeM: s.altitude!,
        }));

    return {
        distanceM: projectAlongRouteDistanceM(
            activeRecord.latitude,
            activeRecord.longitude,
            fallbackNodes
        ),
        altitudeM: activeRecord.altitude ?? 0,
        isReplay,
        trace,
    };
}

export function buildFlightFitBoundsPoints(
    flight: Flight,
    departureHub: Hub | null,
    arrivalHub: Hub | null,
    activeRecord: TelemetryRecord | null
): Array<{ lat: number; lng: number }> {
    const pts: Array<{ lat: number; lng: number }> = [];
    if (
        departureHub?.location?.latitude !== undefined &&
        departureHub?.location?.longitude !== undefined
    ) {
        pts.push({
            lat: departureHub.location.latitude,
            lng: departureHub.location.longitude,
        });
    }
    if (
        arrivalHub?.location?.latitude !== undefined &&
        arrivalHub?.location?.longitude !== undefined
    ) {
        pts.push({
            lat: arrivalHub.location.latitude,
            lng: arrivalHub.location.longitude,
        });
    }
    for (const wp of flight.waypoints ?? []) {
        if (isValidGeoPoint(wp.latitude, wp.longitude)) {
            pts.push({ lat: wp.latitude, lng: wp.longitude });
        }
    }
    if (
        activeRecord?.latitude != null &&
        activeRecord?.longitude != null &&
        isValidGeoPoint(activeRecord.latitude, activeRecord.longitude)
    ) {
        pts.push({ lat: activeRecord.latitude, lng: activeRecord.longitude });
    }
    return pts;
}

export function computeLegEtaProgress(
    flight: Flight,
    departureHub: Hub | null,
    arrivalHub: Hub | null,
    telemetry: TelemetryRecord | null,
    drone: Drone | null
): LegEtaProgress | null {
    const wps = [...(flight.waypoints ?? [])].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    const routePts: Array<{ label: string; lat: number; lng: number }> = [];
    if (
        departureHub?.location?.latitude !== undefined &&
        departureHub?.location?.longitude !== undefined
    ) {
        routePts.push({
            label: departureHub.code || departureHub.name || "DEP",
            lat: departureHub.location.latitude,
            lng: departureHub.location.longitude,
        });
    }
    for (const wp of wps) {
        if (wp.latitude !== undefined && wp.longitude !== undefined) {
            routePts.push({
                label: wp.name || `WP ${wp.sequence}`,
                lat: wp.latitude,
                lng: wp.longitude,
            });
        }
    }
    if (
        arrivalHub?.location?.latitude !== undefined &&
        arrivalHub?.location?.longitude !== undefined
    ) {
        const last = routePts[routePts.length - 1];
        const distLast = last
            ? calculateDistance(
                  last.lat,
                  last.lng,
                  arrivalHub.location.latitude,
                  arrivalHub.location.longitude
              )
            : 999;
        if (distLast > 15) {
            routePts.push({
                label: arrivalHub.code || arrivalHub.name || "ARR",
                lat: arrivalHub.location.latitude,
                lng: arrivalHub.location.longitude,
            });
        }
    }

    if (routePts.length < 2) return null;

    let totalM = 0;
    for (let i = 1; i < routePts.length; i++) {
        totalM += calculateDistance(
            routePts[i - 1].lat,
            routePts[i - 1].lng,
            routePts[i].lat,
            routePts[i].lng
        );
    }

    if (telemetry?.latitude == null || telemetry?.longitude == null) {
        return {
            nextLabel: routePts[1].label,
            distToNextM: calculateDistance(
                routePts[0].lat,
                routePts[0].lng,
                routePts[1].lat,
                routePts[1].lng
            ),
            remainingM: totalM,
            progressPct: 0,
            etaMinutes: null,
        };
    }

    let nearestIdx = 0;
    let minDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < routePts.length; i++) {
        const d = calculateDistance(
            telemetry.latitude,
            telemetry.longitude,
            routePts[i].lat,
            routePts[i].lng
        );
        if (d < minDist) {
            minDist = d;
            nearestIdx = i;
        }
    }
    const nextIdx = Math.min(routePts.length - 1, Math.max(1, nearestIdx + (minDist < 45 ? 1 : 0)));
    const distToNextM = calculateDistance(
        telemetry.latitude,
        telemetry.longitude,
        routePts[nextIdx].lat,
        routePts[nextIdx].lng
    );
    let tailM = distToNextM;
    for (let i = nextIdx + 1; i < routePts.length; i++) {
        tailM += calculateDistance(
            routePts[i - 1].lat,
            routePts[i - 1].lng,
            routePts[i].lat,
            routePts[i].lng
        );
    }

    const speedMs = telemetry.speed;
    const effectiveSpd =
        speedMs != null && speedMs > 1.0
            ? speedMs
            : (drone?.cruiseSpeedMs ?? DRONE_PHYSICS_DEFAULTS.cruiseSpeedMs);
    const etaMinutes = effectiveSpd > 0 ? Math.max(1, Math.round(tailM / effectiveSpd / 60)) : null;
    const progressPct =
        totalM > 0 ? Math.min(100, Math.max(0, Math.round(((totalM - tailM) / totalM) * 100))) : 0;

    return {
        nextLabel: routePts[nextIdx].label,
        distToNextM,
        remainingM: tailM,
        progressPct,
        etaMinutes,
    };
}

export function summarizeCommandParams(
    rawParams?: string | null,
    hubCodeMap?: Map<string, string>
): string {
    if (!rawParams) return "";
    try {
        const parsed = JSON.parse(rawParams) as Record<string, unknown>;
        if (typeof parsed.targetHubId === "string" && parsed.targetHubId) {
            const hubLabel = hubCodeMap?.get(parsed.targetHubId) ?? parsed.targetHubId.slice(0, 8);
            return `→ ${hubLabel}`;
        }
        if (parsed.targetAltitude !== undefined || parsed.altitude !== undefined) {
            const alt = Number(parsed.targetAltitude ?? parsed.altitude);
            if (!Number.isNaN(alt) && parsed.latitude === undefined) {
                return `${Math.round(alt)} m`;
            }
        }
        if (parsed.targetSpeedMps !== undefined || parsed.cruiseSpeedMs !== undefined) {
            const spd = Number(parsed.targetSpeedMps ?? parsed.cruiseSpeedMs);
            if (!Number.isNaN(spd)) return `${spd.toFixed(1)} m/s`;
        }
        if (parsed.latitude !== undefined && parsed.longitude !== undefined) {
            const lat = Number(parsed.latitude);
            const lng = Number(parsed.longitude);
            const alt =
                parsed.altitude !== undefined ? ` · ${Math.round(Number(parsed.altitude))}m` : "";
            if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
                return `[${lat.toFixed(4)}, ${lng.toFixed(4)}]${alt}`;
            }
        }
    } catch {
        return "";
    }
    return "";
}

export function getCardinalDirectionLabel(deg: number): string {
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const norm = ((deg % 360) + 360) % 360;
    return dirs[Math.round(norm / 45) % 8];
}

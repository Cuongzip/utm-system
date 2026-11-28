import type { Hub, ProfilePoint } from "@/types";
import { calculateDistance } from "@/utils";
import { isDuplicateCoord } from "@/utils/geo";

export const CHART_PADDING = { top: 20, bottom: 22, left: 44, right: 20 } as const;
export const CHART_HEIGHT = 112;

export interface BaseAltitudeWaypoint {
    id?: string;
    tempId?: string;
    sequence?: number;
    name?: string;
    latitude?: number;
    longitude?: number;
    altitude?: number;
}

export interface LiveAltitudeTracePoint {
    distanceM: number;
    altitudeM: number;
}

export interface LiveAltitudeProgress {
    distanceM: number;
    altitudeM: number;
    isReplay?: boolean;
    trace?: LiveAltitudeTracePoint[];
}

export interface ProfileSegment {
    point: ProfilePoint;
    distance: number;
    isSyntheticShaftCorner?: boolean;
}

interface ProfileGeometry {
    minAlt: number;
    maxAlt: number;
    totalDistance: number;
    segments: ProfileSegment[];
}

interface ComputeProfileGeometryInput {
    waypoints: BaseAltitudeWaypoint[];
    departureHub: Hub | null;
    arrivalHub: Hub | null;
    cruisingAltitudeM?: number | null;
    liveProgress?: LiveAltitudeProgress | null;
    fullTrace?: LiveAltitudeTracePoint[];
}

export function computeProfileGeometry({
    waypoints,
    departureHub,
    arrivalHub,
    cruisingAltitudeM,
    liveProgress,
    fullTrace,
}: ComputeProfileGeometryInput): ProfileGeometry {
    const sorted = [...waypoints].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    const rawEntries: Array<{ point: ProfilePoint; isSyntheticShaftCorner?: boolean }> = [];

    const hasDep =
        departureHub?.location?.latitude !== undefined &&
        departureHub?.location?.longitude !== undefined;
    const hasArr =
        arrivalHub?.location?.latitude !== undefined &&
        arrivalHub?.location?.longitude !== undefined;

    const defaultCruise = Math.max(20, cruisingAltitudeM ?? 120);
    const firstAirborneWp = sorted.find((w) => (w.altitude ?? 0) > 15);
    const firstCruiseAlt = firstAirborneWp?.altitude ?? defaultCruise;

    if (hasDep) {
        const depLat = departureHub.location!.latitude;
        const depLng = departureHub.location!.longitude;
        rawEntries.push({
            point: {
                id: "hub-dep",
                label: departureHub.code || departureHub.name || "DEP",
                altitude: 0,
                latitude: depLat,
                longitude: depLng,
                isDeparture: true,
            },
        });
        rawEntries.push({
            point: {
                id: "hub-dep-top",
                label: "",
                altitude: firstCruiseAlt,
                latitude: depLat,
                longitude: depLng,
            },
            isSyntheticShaftCorner: true,
        });
    }

    sorted.forEach((wp, idx) => {
        if (wp.latitude === undefined || wp.longitude === undefined) return;
        const lat = wp.latitude;
        const lng = wp.longitude;
        const alt = wp.altitude ?? defaultCruise;

        const isAtDep =
            hasDep && isDuplicateCoord(departureHub.location!, { latitude: lat, longitude: lng });
        const isAtArr =
            hasArr && isDuplicateCoord(arrivalHub.location!, { latitude: lat, longitude: lng });
        if ((isAtDep || isAtArr) && alt <= 15) {
            return;
        }

        const last = rawEntries[rawEntries.length - 1]?.point;
        const isDupSameAlt =
            last &&
            isDuplicateCoord(last, { latitude: lat, longitude: lng }) &&
            Math.abs(last.altitude - alt) < 2;

        if (!isDupSameAlt) {
            rawEntries.push({
                point: {
                    id: String(wp.id || wp.tempId || idx),
                    label: String(wp.sequence ?? idx + 1),
                    altitude: alt,
                    latitude: lat,
                    longitude: lng,
                    waypoint: wp as unknown as ProfilePoint["waypoint"],
                },
            });
        }
    });

    if (hasArr) {
        const arrLat = arrivalHub.location!.latitude;
        const arrLng = arrivalHub.location!.longitude;
        const lastEntry = rawEntries[rawEntries.length - 1];
        const lastCruiseAlt =
            lastEntry && lastEntry.point.altitude > 15 ? lastEntry.point.altitude : firstCruiseAlt;

        const isLastAtArrTop =
            lastEntry &&
            isDuplicateCoord(lastEntry.point, { latitude: arrLat, longitude: arrLng }) &&
            Math.abs(lastEntry.point.altitude - lastCruiseAlt) < 2;

        if (!isLastAtArrTop) {
            rawEntries.push({
                point: {
                    id: "hub-arr-top",
                    label: "",
                    altitude: lastCruiseAlt,
                    latitude: arrLat,
                    longitude: arrLng,
                },
                isSyntheticShaftCorner: true,
            });
        }

        rawEntries.push({
            point: {
                id: "hub-arr",
                label: arrivalHub.code || arrivalHub.name || "ARR",
                altitude: 0,
                latitude: arrLat,
                longitude: arrLng,
                isArrival: true,
            },
        });
    }

    if (rawEntries.length === 0) {
        return { minAlt: 0, maxAlt: 100, totalDistance: 0, segments: [] };
    }

    let cumDistance = 0;
    const segs: ProfileSegment[] = rawEntries.map((entry, i) => {
        if (i > 0) {
            const prev = rawEntries[i - 1].point;
            const dist = calculateDistance(
                { lat: prev.latitude, lng: prev.longitude },
                { lat: entry.point.latitude, lng: entry.point.longitude }
            );
            cumDistance += dist;
        }
        return {
            point: entry.point,
            distance: cumDistance,
            isSyntheticShaftCorner: entry.isSyntheticShaftCorner,
        };
    });

    const altitudes = segs.map((s) => s.point.altitude);
    if (liveProgress) {
        altitudes.push(liveProgress.altitudeM);
        if (liveProgress.trace) {
            for (const tp of liveProgress.trace) {
                altitudes.push(tp.altitudeM);
            }
        }
    }
    if (fullTrace) {
        for (const tp of fullTrace) {
            altitudes.push(tp.altitudeM);
        }
    }
    const minA = Math.min(0, ...altitudes);
    const maxA = Math.max(120, ...altitudes);

    return {
        minAlt: minA,
        maxAlt: Math.ceil(maxA / 20) * 20,
        totalDistance: cumDistance,
        segments: segs,
    };
}

export function projectDistanceX(dist: number, totalDistance: number, innerW: number): number {
    if (totalDistance === 0) return CHART_PADDING.left;
    const clamped = Math.min(totalDistance, Math.max(0, dist));
    return CHART_PADDING.left + (clamped / totalDistance) * innerW;
}

export function projectAltitudeY(
    alt: number,
    minAlt: number,
    maxAlt: number,
    innerH: number
): number {
    const diff = maxAlt - minAlt;
    const range = diff === 0 ? 1 : diff;
    const clampedAlt = Math.min(maxAlt, Math.max(minAlt, alt));
    const ratio = (clampedAlt - minAlt) / range;
    return CHART_PADDING.top + innerH * (1 - ratio);
}

export function buildPlannedProfilePaths(
    segments: ProfileSegment[],
    getX: (dist: number) => number,
    getY: (alt: number) => number,
    innerH: number
): { pathD: string; areaD: string } {
    if (segments.length === 0) return { pathD: "", areaD: "" };
    const pathD = segments.reduce((acc, seg, i) => {
        const x = getX(seg.distance);
        const y = getY(seg.point.altitude);
        return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, "");
    const baseY = CHART_PADDING.top + innerH;
    const firstX = getX(segments[0].distance);
    const lastX = getX(segments[segments.length - 1].distance);
    const areaD = `${pathD} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
    return { pathD, areaD };
}

export function buildTracePath(
    trace: LiveAltitudeTracePoint[] | undefined,
    getX: (dist: number) => number,
    getY: (alt: number) => number
): string {
    if (!trace || trace.length < 2) return "";
    return trace.reduce((acc, pt, idx) => {
        const x = getX(pt.distanceM);
        const y = getY(pt.altitudeM);
        return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, "");
}

export function buildRemainingTracePath(
    fullTrace: LiveAltitudeTracePoint[] | undefined,
    playedLen: number,
    getX: (dist: number) => number,
    getY: (alt: number) => number
): string {
    if (!fullTrace || fullTrace.length < 2) return "";
    const startIdx = playedLen > 0 ? Math.max(0, playedLen - 1) : 0;
    const slice = fullTrace.slice(startIdx);
    return buildTracePath(slice, getX, getY);
}

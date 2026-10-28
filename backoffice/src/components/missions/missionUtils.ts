import { addWaypointBody } from "@/generated/mission";
import { calculatePathDistance, interpolatePoint } from "@/utils/geo";
import type { Hub, Waypoint, AddWaypointPayload, ProfilePoint } from "@/types";
import { missionService } from "@/services/missionService";
import zod from "zod";

export const waypointsValidationSchema = zod.object({
    waypoints: zod.array(addWaypointBody),
});

export function sanitizeWaypointForApi(
    wp: Partial<Waypoint>,
    defaultAltitude = 50
): AddWaypointPayload {
    return {
        name: wp.name?.trim() || undefined,
        latitude: Number(wp.latitude),
        longitude: Number(wp.longitude),
        altitude:
            wp.altitude !== undefined && wp.altitude !== null && !isNaN(Number(wp.altitude))
                ? Number(wp.altitude)
                : defaultAltitude,
        actions:
            wp.actions && typeof wp.actions === "object" && Object.keys(wp.actions).length > 0
                ? wp.actions
                : undefined,
        conditions:
            wp.conditions &&
            typeof wp.conditions === "object" &&
            Object.keys(wp.conditions).length > 0
                ? wp.conditions
                : undefined,
    };
}

export type MissionRoutePoint = ProfilePoint;

export function buildMissionRoutePoints(
    waypoints: Waypoint[],
    departureHub?: Hub | null,
    arrivalHub?: Hub | null,
    defaultAltitude = 50
): ProfilePoint[] {
    const sorted = [...waypoints].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    const pts: MissionRoutePoint[] = [];

    const hasDep =
        departureHub?.location?.lat !== undefined && departureHub?.location?.lng !== undefined;
    const hasArr =
        arrivalHub?.location?.lat !== undefined && arrivalHub?.location?.lng !== undefined;

    if (hasDep) {
        pts.push({
            id: "hub-dep",
            label: departureHub.code || "DEP",
            altitude: 0,
            latitude: departureHub.location!.lat,
            longitude: departureHub.location!.lng,
            isDeparture: true,
        });
    }

    sorted.forEach((wp, idx) => {
        const lat = wp.latitude ?? 0;
        const lng = wp.longitude ?? 0;
        const alt = wp.altitude ?? defaultAltitude;

        const last = pts[pts.length - 1];
        const isDup =
            last &&
            Math.abs(last.latitude - lat) < 0.0001 &&
            Math.abs(last.longitude - lng) < 0.0001;

        if (!isDup) {
            pts.push({
                id: String(wp.id || wp.tempId || idx),
                label: String(wp.sequence ?? idx + 1),
                altitude: alt,
                latitude: lat,
                longitude: lng,
                waypoint: wp,
            });
        }
    });

    if (hasArr) {
        const arrLat = arrivalHub.location!.lat;
        const arrLng = arrivalHub.location!.lng;
        const last = pts[pts.length - 1];
        const isDup =
            last &&
            Math.abs(last.latitude - arrLat) < 0.0001 &&
            Math.abs(last.longitude - arrLng) < 0.0001;

        if (!isDup) {
            pts.push({
                id: "hub-arr",
                label: arrivalHub.code || "ARR",
                altitude: 0,
                latitude: arrLat,
                longitude: arrLng,
                isArrival: true,
            });
        }
    }

    return pts;
}

export function calculateMissionDistance(
    waypoints: Waypoint[],
    departureHub?: Hub | null,
    arrivalHub?: Hub | null
): number {
    const route = buildMissionRoutePoints(waypoints, departureHub, arrivalHub);
    return calculatePathDistance(route.map((p) => ({ lat: p.latitude, lng: p.longitude })));
}

export function generateHubToHubWaypoints(
    departureHub: Hub,
    arrivalHub: Hub,
    defaultAltitude = 50
): Waypoint[] {
    const depLat = departureHub.location?.lat;
    const depLng = departureHub.location?.lng;
    const arrLat = arrivalHub.location?.lat;
    const arrLng = arrivalHub.location?.lng;

    if (
        depLat === undefined ||
        depLng === undefined ||
        arrLat === undefined ||
        arrLng === undefined
    ) {
        return [];
    }

    const p1 = { lat: depLat, lng: depLng };
    const p2 = { lat: arrLat, lng: arrLng };
    const mid1 = interpolatePoint(p1, p2, 0.33);
    const mid2 = interpolatePoint(p1, p2, 0.66);

    return [
        {
            tempId: `hub-wp-1-${Date.now()}`,
            sequence: 1,
            name: `Dep: ${departureHub.name}`,
            latitude: Number(depLat.toFixed(6)),
            longitude: Number(depLng.toFixed(6)),
            altitude: defaultAltitude,
        },
        {
            tempId: `hub-wp-2-${Date.now()}`,
            sequence: 2,
            name: "Climb & Enroute",
            latitude: mid1.lat,
            longitude: mid1.lng,
            altitude: defaultAltitude + 20,
        },
        {
            tempId: `hub-wp-3-${Date.now()}`,
            sequence: 3,
            name: "Approach Fix",
            latitude: mid2.lat,
            longitude: mid2.lng,
            altitude: defaultAltitude + 10,
        },
        {
            tempId: `hub-wp-4-${Date.now()}`,
            sequence: 4,
            name: `Arr: ${arrivalHub.name}`,
            latitude: Number(arrLat.toFixed(6)),
            longitude: Number(arrLng.toFixed(6)),
            altitude: defaultAltitude,
        },
    ];
}

export function determineActiveTabFromErrors(
    errors: Record<string, string>,
    waypoints: Waypoint[]
): {
    tab: "details" | "waypoints" | "schedule";
    firstInvalidWaypointId?: string;
} {
    if (errors.name || errors.departureHubId || errors.arrivalHubId) {
        return { tab: "details" };
    }
    const wpKey = Object.keys(errors).find((k) => k.startsWith("waypoints."));
    if (wpKey) {
        const match = wpKey.match(/^waypoints\.(\d+)/);
        const wpIdx = match ? parseInt(match[1], 10) : -1;
        const wp = waypoints[wpIdx];
        return {
            tab: "waypoints",
            firstInvalidWaypointId: wp ? String(wp.id || wp.tempId) : undefined,
        };
    }
    if (errors.scheduledAt) {
        return { tab: "schedule" };
    }
    return { tab: "details" };
}

export async function createMissionWaypoints(
    missionId: string,
    waypoints: Waypoint[],
    defaultAltitude = 50
): Promise<void> {
    for (const wp of waypoints) {
        if (wp.latitude !== undefined && wp.longitude !== undefined) {
            await missionService.addWaypoint(
                missionId,
                sanitizeWaypointForApi(wp, defaultAltitude)
            );
        }
    }
}

export async function syncMissionWaypoints(
    missionId: string,
    initialWaypoints: Waypoint[],
    currentWaypoints: Waypoint[],
    defaultAltitude = 50
): Promise<void> {
    const currentWpIds = new Set(currentWaypoints.map((w) => w.id).filter(Boolean));
    const toDelete = initialWaypoints.filter((w) => w.id && !currentWpIds.has(w.id));
    for (const delWp of toDelete) {
        await missionService.deleteWaypoint(missionId, delWp.id!);
    }

    const initialMap = new Map(initialWaypoints.map((w) => [w.id, w]));
    for (const wp of currentWaypoints) {
        if (wp.id && initialMap.has(wp.id)) {
            const init = initialMap.get(wp.id)!;
            const hasChanged =
                init.latitude !== wp.latitude ||
                init.longitude !== wp.longitude ||
                init.altitude !== wp.altitude ||
                init.name !== wp.name ||
                JSON.stringify(init.actions || null) !== JSON.stringify(wp.actions || null) ||
                JSON.stringify(init.conditions || null) !== JSON.stringify(wp.conditions || null);

            if (hasChanged && wp.latitude !== undefined && wp.longitude !== undefined) {
                await missionService.updateWaypoint(
                    missionId,
                    wp.id,
                    sanitizeWaypointForApi(wp, defaultAltitude)
                );
            }
        }
    }

    for (const wp of currentWaypoints) {
        if (!wp.id && wp.latitude !== undefined && wp.longitude !== undefined) {
            await missionService.addWaypoint(
                missionId,
                sanitizeWaypointForApi(wp, defaultAltitude)
            );
        }
    }

    const orderChanged = currentWaypoints.some(
        (wp, idx) => wp.id && initialMap.get(wp.id)?.sequence !== idx + 1
    );
    if (orderChanged && toDelete.length === 0 && currentWaypoints.every((w) => Boolean(w.id))) {
        await missionService.reorderWaypoints(missionId, {
            order: currentWaypoints.map((wp, idx) => ({
                waypointId: wp.id!,
                sequence: idx + 1,
            })),
        });
    }
}

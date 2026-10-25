import { addWaypointBody } from "@/generated/mission";
import { calculateDistance } from "@/utils/geo";
import type { Hub, Waypoint, AddWaypointPayload } from "@/types";
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

export function calculateMissionDistance(
    waypoints: Waypoint[],
    departureHub?: Hub | null,
    arrivalHub?: Hub | null
): number {
    const sorted = [...waypoints].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    const pts: { lat: number; lng: number }[] = [];

    if (departureHub?.location?.lat !== undefined && departureHub?.location?.lng !== undefined) {
        pts.push({
            lat: departureHub.location.lat,
            lng: departureHub.location.lng,
        });
    }

    sorted.forEach((wp) => {
        const lat = wp.latitude ?? 0;
        const lng = wp.longitude ?? 0;
        const last = pts[pts.length - 1];
        if (!last || calculateDistance(last.lat, last.lng, lat, lng) > 15) {
            pts.push({ lat, lng });
        }
    });

    if (arrivalHub?.location?.lat !== undefined && arrivalHub?.location?.lng !== undefined) {
        const arrLat = arrivalHub.location.lat;
        const arrLng = arrivalHub.location.lng;
        const last = pts[pts.length - 1];
        if (!last || calculateDistance(last.lat, last.lng, arrLat, arrLng) > 15) {
            pts.push({ lat: arrLat, lng: arrLng });
        }
    }

    if (pts.length >= 2) {
        let sum = 0;
        for (let i = 1; i < pts.length; i++) {
            sum += calculateDistance(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng);
        }
        return sum;
    }
    return 0;
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

    const midLat1 = depLat + (arrLat - depLat) * 0.33;
    const midLng1 = depLng + (arrLng - depLng) * 0.33;
    const midLat2 = depLat + (arrLat - depLat) * 0.66;
    const midLng2 = depLng + (arrLng - depLng) * 0.66;

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
            latitude: Number(midLat1.toFixed(6)),
            longitude: Number(midLng1.toFixed(6)),
            altitude: defaultAltitude + 20,
        },
        {
            tempId: `hub-wp-3-${Date.now()}`,
            sequence: 3,
            name: "Approach Fix",
            latitude: Number(midLat2.toFixed(6)),
            longitude: Number(midLng2.toFixed(6)),
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

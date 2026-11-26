import { addWaypointBody } from "@/generated/mission";
import { isDuplicateCoord } from "@/utils/geo";
import { extractIntermediateWaypoints } from "@/components/waypoints";
import {
    STOPOVER_TYPE,
    WAYPOINT_TYPE,
    type Hub,
    type Waypoint,
    type AddWaypointPayload,
    type ProfilePoint,
} from "@/types";
import { missionService } from "@/services/missionService";
import zod from "zod";

const missionWaypointBody = addWaypointBody.superRefine((wp, ctx) => {
    const isHub = wp.waypointType === WAYPOINT_TYPE.HUB || Boolean(wp.hubId);
    if (isHub) {
        if (!wp.hubId) {
            ctx.addIssue({
                code: "custom",
                path: ["hubId"],
                message: "Stopover hub is required for HUB waypoints",
            });
        }
        if (!wp.stopoverType || wp.stopoverType === STOPOVER_TYPE.NONE) {
            ctx.addIssue({
                code: "custom",
                path: ["stopoverType"],
                message: "HUB waypoint requires a non-NONE stopover type",
            });
        }
    } else if (wp.altitude !== undefined && wp.altitude <= 0) {
        ctx.addIssue({
            code: "custom",
            path: ["altitude"],
            message: "Altitude must be greater than 0m AGL for coordinate waypoints",
        });
    }
});

export const waypointsValidationSchema = zod.object({
    waypoints: zod.array(missionWaypointBody),
});

export function sanitizeWaypointForApi(
    wp: Partial<Waypoint>,
    defaultAltitude = 50
): AddWaypointPayload {
    const isStopover = Boolean(wp.stopoverType && wp.stopoverType !== STOPOVER_TYPE.NONE);
    const isHub = wp.waypointType === WAYPOINT_TYPE.HUB || (isStopover && Boolean(wp.hubId));
    const resolvedAltitude = Number.isFinite(wp.altitude)
        ? Number(wp.altitude)
        : isHub
          ? 0
          : defaultAltitude;
    return {
        name: wp.name?.trim() || undefined,
        waypointType: isHub ? WAYPOINT_TYPE.HUB : WAYPOINT_TYPE.COORDINATE,
        latitude: Number(wp.latitude),
        longitude: Number(wp.longitude),
        altitude: resolvedAltitude,
        hubId: isHub && wp.hubId ? wp.hubId : undefined,
        stopoverType: isHub
            ? isStopover
                ? wp.stopoverType
                : STOPOVER_TYPE.RECHARGE
            : STOPOVER_TYPE.NONE,
        groundTimeMinutes: isHub ? wp.groundTimeMinutes : undefined,
        payloadDeltaKg: isHub ? wp.payloadDeltaKg : undefined,
        hoverDurationSec: wp.hoverDurationSec,
        speedToWaypoint: wp.speedToWaypoint,
        headingAtWaypoint: wp.headingAtWaypoint,
        turnRadius: wp.turnRadius,
        waitForConfirmation: wp.waitForConfirmation,
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

export function buildMissionRoutePoints(
    waypoints: Waypoint[],
    departureHub?: Hub | null,
    arrivalHub?: Hub | null,
    defaultAltitude = 50
): ProfilePoint[] {
    const sorted = [...waypoints].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    const pts: ProfilePoint[] = [];

    const hasDep =
        departureHub?.location?.latitude !== undefined &&
        departureHub?.location?.longitude !== undefined;
    const hasArr =
        arrivalHub?.location?.latitude !== undefined &&
        arrivalHub?.location?.longitude !== undefined;

    if (hasDep) {
        pts.push({
            id: "hub-dep",
            label: departureHub.code || departureHub.name || "DEP",
            altitude: 0,
            latitude: departureHub.location!.latitude,
            longitude: departureHub.location!.longitude,
            isDeparture: true,
        });
    }

    sorted.forEach((wp, idx) => {
        const lat = wp.latitude ?? 0;
        const lng = wp.longitude ?? 0;
        const alt = wp.altitude ?? defaultAltitude;

        const last = pts[pts.length - 1];
        const isDup = last && isDuplicateCoord(last, { latitude: lat, longitude: lng });

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
        const arrLat = arrivalHub.location!.latitude;
        const arrLng = arrivalHub.location!.longitude;
        const last = pts[pts.length - 1];
        const isDup = last && isDuplicateCoord(last, { latitude: arrLat, longitude: arrLng });

        if (!isDup) {
            pts.push({
                id: "hub-arr",
                label: arrivalHub.code || arrivalHub.name || "ARR",
                altitude: 0,
                latitude: arrLat,
                longitude: arrLng,
                isArrival: true,
            });
        }
    }

    return pts;
}

export function determineActiveTabFromErrors(
    errors: Record<string, string>,
    waypoints: Waypoint[]
): {
    tab: "details" | "waypoints" | "schedule";
    firstInvalidWaypointId?: string;
} {
    if (errors.code || errors.name || errors.departureHubId || errors.arrivalHubId) {
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
    defaultAltitude = 50,
    departureHub?: Hub | null,
    arrivalHub?: Hub | null
): Promise<void> {
    const initialIntermediates = extractIntermediateWaypoints(
        initialWaypoints,
        departureHub,
        arrivalHub
    );
    const currentWpIds = new Set(currentWaypoints.map((w) => w.id).filter(Boolean));
    const toDelete = initialIntermediates.filter((w) => w.id && !currentWpIds.has(w.id));
    for (const delWp of toDelete) {
        await missionService.deleteWaypoint(missionId, delWp.id!);
    }

    const initialMap = new Map(initialIntermediates.map((w) => [w.id, w]));
    for (const wp of currentWaypoints) {
        if (wp.id && initialMap.has(wp.id)) {
            const init = initialMap.get(wp.id)!;
            const hasChanged =
                init.latitude !== wp.latitude ||
                init.longitude !== wp.longitude ||
                init.altitude !== wp.altitude ||
                init.name !== wp.name ||
                (init.waypointType ?? WAYPOINT_TYPE.COORDINATE) !==
                    (wp.waypointType ?? WAYPOINT_TYPE.COORDINATE) ||
                (init.hubId ?? undefined) !== (wp.hubId ?? undefined) ||
                (init.stopoverType ?? STOPOVER_TYPE.NONE) !==
                    (wp.stopoverType ?? STOPOVER_TYPE.NONE) ||
                (init.groundTimeMinutes ?? undefined) !== (wp.groundTimeMinutes ?? undefined) ||
                (init.payloadDeltaKg ?? undefined) !== (wp.payloadDeltaKg ?? undefined) ||
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

    const initialOrderIds = initialIntermediates.map((w) => w.id).filter(Boolean);
    const currentOrderIds = currentWaypoints.map((w) => w.id).filter(Boolean);
    const orderChanged =
        initialOrderIds.length === currentOrderIds.length &&
        currentOrderIds.some((id, idx) => id !== initialOrderIds[idx]);
    if (orderChanged && toDelete.length === 0 && currentWaypoints.every((w) => Boolean(w.id))) {
        await missionService.reorderWaypoints(missionId, {
            order: currentWaypoints.map((wp, idx) => ({
                waypointId: wp.id!,
                sequence: idx + 1,
            })),
        });
    }
}

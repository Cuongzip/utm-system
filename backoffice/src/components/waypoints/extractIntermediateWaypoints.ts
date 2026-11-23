import type { Hub } from "@/types";

export interface WaypointLocationLike {
    name?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    actions?: unknown;
}

export function extractIntermediateWaypoints<T extends WaypointLocationLike>(
    rawWaypoints: T[] | undefined | null,
    departureHub?: Hub | null,
    arrivalHub?: Hub | null
): T[] {
    if (!rawWaypoints || rawWaypoints.length === 0) return [];
    let list = [...rawWaypoints];

    const isDeparturePoint = (wp: T): boolean => {
        const actionType = (wp.actions as { type?: string } | undefined)?.type;
        if (actionType === "takeoff") return true;
        if (wp.name && (wp.name.startsWith("Departure:") || wp.name.startsWith("Dep:")))
            return true;
        if (
            departureHub?.location?.latitude !== undefined &&
            departureHub?.location?.longitude !== undefined &&
            wp.latitude !== undefined &&
            wp.latitude !== null &&
            wp.longitude !== undefined &&
            wp.longitude !== null &&
            Math.abs(Number(wp.latitude) - departureHub.location.latitude) < 0.0001 &&
            Math.abs(Number(wp.longitude) - departureHub.location.longitude) < 0.0001
        ) {
            return true;
        }
        return false;
    };

    const isArrivalPoint = (wp: T): boolean => {
        const actionType = (wp.actions as { type?: string } | undefined)?.type;
        if (actionType === "land") return true;
        if (wp.name && (wp.name.startsWith("Arrival:") || wp.name.startsWith("Arr:"))) return true;
        if (
            arrivalHub?.location?.latitude !== undefined &&
            arrivalHub?.location?.longitude !== undefined &&
            wp.latitude !== undefined &&
            wp.latitude !== null &&
            wp.longitude !== undefined &&
            wp.longitude !== null &&
            Math.abs(Number(wp.latitude) - arrivalHub.location.latitude) < 0.0001 &&
            Math.abs(Number(wp.longitude) - arrivalHub.location.longitude) < 0.0001
        ) {
            return true;
        }
        return false;
    };

    while (list.length > 0 && isDeparturePoint(list[0])) {
        list = list.slice(1);
    }

    while (list.length > 0 && isArrivalPoint(list[list.length - 1])) {
        list = list.slice(0, -1);
    }

    return list;
}

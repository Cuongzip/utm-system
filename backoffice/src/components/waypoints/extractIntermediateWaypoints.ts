import { STOPOVER_TYPE, WAYPOINT_ACTION_TYPE, WAYPOINT_TYPE, type Hub } from "@/types";

interface WaypointLocationLike {
    name?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    waypointType?: string | null;
    hubId?: string | null;
    stopoverType?: string | null;
    actions?: unknown;
}

export function extractIntermediateWaypoints<T extends WaypointLocationLike>(
    rawWaypoints: T[] | undefined | null,
    departureHub?: Hub | null,
    arrivalHub?: Hub | null
): T[] {
    if (!rawWaypoints || rawWaypoints.length === 0) return [];
    let list = [...rawWaypoints];

    const isIntermediateStopover = (wp: T): boolean =>
        Boolean(wp.stopoverType && wp.stopoverType !== STOPOVER_TYPE.NONE);

    const isDeparturePoint = (wp: T): boolean => {
        if (isIntermediateStopover(wp)) return false;
        const actionType = (wp.actions as { type?: string } | undefined)?.type;
        if (actionType === WAYPOINT_ACTION_TYPE.TAKEOFF) return true;
        if (wp.name && (wp.name.startsWith("Departure:") || wp.name.startsWith("Dep:")))
            return true;
        if (
            wp.waypointType === WAYPOINT_TYPE.HUB &&
            departureHub?.id &&
            wp.hubId === departureHub.id
        ) {
            return true;
        }
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
        if (isIntermediateStopover(wp)) return false;
        const actionType = (wp.actions as { type?: string } | undefined)?.type;
        if (actionType === WAYPOINT_ACTION_TYPE.LAND) return true;
        if (wp.name && (wp.name.startsWith("Arrival:") || wp.name.startsWith("Arr:"))) return true;
        if (wp.waypointType === WAYPOINT_TYPE.HUB && arrivalHub?.id && wp.hubId === arrivalHub.id) {
            return true;
        }
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

    if (list.length > 0 && isDeparturePoint(list[0])) {
        list = list.slice(1);
    }

    if (list.length > 0 && isArrivalPoint(list[list.length - 1])) {
        list = list.slice(0, -1);
    }

    return list;
}

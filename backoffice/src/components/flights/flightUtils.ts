import { calculatePathDistance } from "@/utils/geo";
import type { Hub, ProfilePoint } from "@/types";
import type { FlightWaypoint } from "./useFlightRoute";

export function buildFlightRoutePoints(
    waypoints: FlightWaypoint[] = [],
    departureHub?: Hub | null,
    arrivalHub?: Hub | null,
    defaultAltitude = 120
): ProfilePoint[] {
    const sorted = [...waypoints].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    const pts: ProfilePoint[] = [];

    const hasDep =
        departureHub?.location?.lat !== undefined && departureHub?.location?.lng !== undefined;
    const hasArr =
        arrivalHub?.location?.lat !== undefined && arrivalHub?.location?.lng !== undefined;

    if (hasDep) {
        pts.push({
            id: "hub-dep",
            label: departureHub.code || departureHub.name || "DEP",
            altitude: departureHub.altitudeMsl ?? 0,
            latitude: departureHub.location!.lat,
            longitude: departureHub.location!.lng,
            isDeparture: true,
        });
    }

    sorted.forEach((wp, idx) => {
        const lat = wp.lat ?? 0;
        const lng = wp.lng ?? 0;
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
                label: arrivalHub.code || arrivalHub.name || "ARR",
                altitude: arrivalHub.altitudeMsl ?? 0,
                latitude: arrLat,
                longitude: arrLng,
                isArrival: true,
            });
        }
    }

    return pts;
}

export function calculateFlightDistance(
    waypoints: FlightWaypoint[] = [],
    departureHub?: Hub | null,
    arrivalHub?: Hub | null,
    defaultAltitude = 120
): number {
    const route = buildFlightRoutePoints(waypoints, departureHub, arrivalHub, defaultAltitude);
    return calculatePathDistance(route.map((p) => ({ lat: p.latitude, lng: p.longitude })));
}

export function convertWaypointsToLineString(
    waypoints: FlightWaypoint[],
    departureHub?: Hub | null,
    arrivalHub?: Hub | null,
    cruisingAltitude = 120
): { type: "LineString"; coordinates: number[][] } | null {
    const coords: number[][] = [];

    if (departureHub?.location?.lng !== undefined && departureHub?.location?.lat !== undefined) {
        coords.push([
            departureHub.location.lng,
            departureHub.location.lat,
            departureHub.altitudeMsl ?? 0,
        ]);
    }

    const sorted = [...waypoints].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    sorted.forEach((wp) => {
        coords.push([wp.lng, wp.lat, wp.altitude ?? cruisingAltitude]);
    });

    if (arrivalHub?.location?.lng !== undefined && arrivalHub?.location?.lat !== undefined) {
        const last = coords[coords.length - 1];
        const isSame =
            last &&
            Math.abs(last[0] - arrivalHub.location.lng) < 0.00001 &&
            Math.abs(last[1] - arrivalHub.location.lat) < 0.00001;

        if (!isSame || coords.length === 1) {
            coords.push([
                arrivalHub.location.lng,
                arrivalHub.location.lat,
                arrivalHub.altitudeMsl ?? 0,
            ]);
        }
    }

    if (coords.length < 2) return null;

    return {
        type: "LineString",
        coordinates: coords,
    };
}

export function determineActiveTabFromFlightErrors(
    errors: Record<string, string>
): "details" | "waypoints" | "schedule" {
    if (
        errors.flightNumber ||
        errors.droneId ||
        errors.departureHubId ||
        errors.arrivalHubId ||
        errors.pilotId ||
        errors.cruisingAltitudeM ||
        errors.executionId ||
        errors.notes
    ) {
        return "details";
    }
    if (errors.plannedRoute || errors["plannedRoute.coordinates"] || errors.route) {
        return "waypoints";
    }
    if (errors.scheduledDeparture || errors.scheduledArrival) {
        return "schedule";
    }
    return "details";
}

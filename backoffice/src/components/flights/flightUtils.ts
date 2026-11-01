import { calculatePathDistance } from "@/utils/geo";
import type { Hub, ProfilePoint, Waypoint } from "@/types";
import { buildMissionRoutePoints } from "@/components/missions/missionUtils";
import type { FlightWaypoint } from "./useFlightRoute";

export function buildFlightRoutePoints(
    waypoints: FlightWaypoint[] = [],
    departureHub?: Hub | null,
    arrivalHub?: Hub | null,
    defaultAltitude = 120
): ProfilePoint[] {
    const normalized: Waypoint[] = waypoints.map((wp) => ({
        id: wp.id,
        tempId: wp.tempId,
        sequence: wp.sequence,
        name: wp.name,
        latitude: wp.lat,
        longitude: wp.lng,
        altitude: wp.altitude,
    }));
    return buildMissionRoutePoints(normalized, departureHub, arrivalHub, defaultAltitude);
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

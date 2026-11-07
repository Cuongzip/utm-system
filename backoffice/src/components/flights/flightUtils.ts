import { calculatePathDistance, isDuplicateCoord } from "@/utils/geo";
import type { Drone, Hub, ProfilePoint, Waypoint } from "@/types";
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

    if (
        departureHub?.location?.longitude !== undefined &&
        departureHub?.location?.latitude !== undefined
    ) {
        coords.push([
            departureHub.location.longitude,
            departureHub.location.latitude,
            departureHub.altitudeMsl ?? 0,
        ]);
    }

    const sorted = [...waypoints].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    sorted.forEach((wp) => {
        coords.push([wp.lng, wp.lat, wp.altitude ?? cruisingAltitude]);
    });

    if (
        arrivalHub?.location?.longitude !== undefined &&
        arrivalHub?.location?.latitude !== undefined
    ) {
        const last = coords[coords.length - 1];
        const isSame =
            last &&
            isDuplicateCoord(
                { lng: last[0], lat: last[1] },
                { lng: arrivalHub.location.longitude, lat: arrivalHub.location.latitude },
                0.00001
            );

        if (!isSame || coords.length === 1) {
            coords.push([
                arrivalHub.location.longitude,
                arrivalHub.location.latitude,
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
        errors.notes ||
        errors.feasibilityOverride
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

export interface RouteFeasibilityEstimate {
    distanceM: number;
    requiredWh: number;
    usableWh: number;
    marginPct: number;
    verdict: "go" | "marginal" | "no_go";
    estimatedDurationMin: number;
}

export function estimateRouteFeasibility(
    distanceM: number,
    drone?: Drone | null,
    payloadKg = 0
): RouteFeasibilityEstimate {
    const batteryCapacityWh =
        drone?.batteryCapacityWh && drone.batteryCapacityWh > 0 ? drone.batteryCapacityWh : 500;
    const maxPayloadKg = drone?.maxPayload && drone.maxPayload > 0 ? drone.maxPayload : 5.0;
    const usableWh = batteryCapacityWh * 0.95 * 0.8;

    const cruisePowerW = 250;
    const hoverPowerW = 400;
    const cruiseSpeedMs = 15;
    const hoverTimeS = 60;

    const payloadFactor = 1.0 + 0.15 * Math.min(1.0, payloadKg / maxPayloadKg);
    const cruiseTimeHours = distanceM / cruiseSpeedMs / 3600;
    const cruiseWh = cruisePowerW * cruiseTimeHours * payloadFactor;
    const hoverTimeHours = (hoverTimeS / 3600) * payloadFactor;
    const hoverWh = hoverPowerW * hoverTimeHours;
    const climbWh = (cruiseWh + hoverWh) * 0.05;
    const requiredWh = cruiseWh + hoverWh + climbWh;

    const marginPct = usableWh > 0 ? ((usableWh - requiredWh) / usableWh) * 100 : -100;

    let verdict: "go" | "marginal" | "no_go" = "go";
    if (marginPct < 0 || payloadKg > maxPayloadKg) {
        verdict = "no_go";
    } else if (marginPct < 20) {
        verdict = "marginal";
    }

    const estimatedDurationMin = Math.max(
        1,
        Math.round((distanceM / cruiseSpeedMs + hoverTimeS) / 60)
    );

    return {
        distanceM,
        requiredWh,
        usableWh,
        marginPct,
        verdict,
        estimatedDurationMin,
    };
}

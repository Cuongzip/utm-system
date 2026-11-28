import { createFlightBody, updateFlightBody } from "@/generated/flight";
import { validateSchema } from "@/utils";
import { calculatePathDistance, isDuplicateCoord } from "@/utils/geo";
import {
    FEASIBILITY_VERDICT,
    WAYPOINT_ACTION_TYPE,
    type CreateFlightPayload,
    type Drone,
    type FeasibilityVerdict,
    type FlightFormPayload,
    type Hub,
    type ProfilePoint,
    type UpdateFlightPayload,
    type Waypoint,
} from "@/types";
import { buildMissionRoutePoints } from "@/components/missions/missionUtils";
import type { FlightWaypoint } from "./useFlightRoute";

function buildFlightRoutePoints(
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
        latitude: wp.latitude,
        longitude: wp.longitude,
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
        coords.push([wp.longitude, wp.latitude, wp.altitude ?? cruisingAltitude]);
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

function determineActiveTabFromFlightErrors(
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

interface RouteFeasibilityEstimate {
    distanceM: number;
    requiredWh: number;
    usableWh: number;
    marginPct: number;
    verdict: FeasibilityVerdict;
    estimatedDurationMin: number;
}

export function estimateRouteFeasibility(
    distanceM: number,
    drone?: Drone | null
): RouteFeasibilityEstimate {
    const batteryCapacityWh =
        drone?.batteryCapacityWh != null && drone.batteryCapacityWh > 0
            ? drone.batteryCapacityWh
            : 400;
    const batteryHealthRatio =
        drone?.batteryHealthPct != null && drone.batteryHealthPct > 0
            ? Math.min(1, drone.batteryHealthPct / 100)
            : 1.0;
    const usableWh = batteryCapacityWh * batteryHealthRatio * 0.8;

    const cruisePowerW =
        drone?.cruisePowerW != null && drone.cruisePowerW > 0 ? drone.cruisePowerW : 280;
    const hoverPowerW =
        drone?.hoverPowerW != null && drone.hoverPowerW > 0 ? drone.hoverPowerW : 350;
    const cruiseSpeedMs =
        drone?.cruiseSpeedMs != null && drone.cruiseSpeedMs > 0 ? drone.cruiseSpeedMs : 15;
    const hoverTimeS = 60;

    const cruiseTimeHours = distanceM / cruiseSpeedMs / 3600;
    const cruiseWh = cruisePowerW * cruiseTimeHours;
    const hoverTimeHours = hoverTimeS / 3600;
    const hoverWh = hoverPowerW * hoverTimeHours;
    const climbWh = (cruiseWh + hoverWh) * 0.05;
    const requiredWh = cruiseWh + hoverWh + climbWh;

    const marginPct = usableWh > 0 ? ((usableWh - requiredWh) / usableWh) * 100 : -100;

    let verdict: FeasibilityVerdict = FEASIBILITY_VERDICT.GO;
    if (marginPct < 0) {
        verdict = FEASIBILITY_VERDICT.NO_GO;
    } else if (marginPct < 20) {
        verdict = FEASIBILITY_VERDICT.MARGINAL;
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

function formatIsoSafe(val?: string): string {
    if (!val) return "";
    try {
        const d = new Date(val);
        return Number.isNaN(d.getTime()) ? "" : d.toISOString();
    } catch {
        return "";
    }
}

interface BuildFlightSavePayloadParams {
    mode: "create" | "edit";
    formData: FlightFormPayload;
    waypoints: FlightWaypoint[];
    computedGeoJsonLineString: { type: string; coordinates: number[][] } | null;
    departureHub: Hub | null;
    arrivalHub: Hub | null;
    feasibilityVerdict: FeasibilityVerdict;
    labels: {
        departureWpName: (hub: string) => string;
        arrivalWpName: (hub: string) => string;
        defaultWaypointName: (seq: number) => string;
    };
}

type BuildFlightSavePayloadResult =
    | {
          success: true;
          payload: CreateFlightPayload | UpdateFlightPayload;
      }
    | {
          success: false;
          errors: Record<string, string>;
          targetTab: "details" | "waypoints" | "schedule";
      };

export function buildFlightSavePayload({
    mode,
    formData,
    waypoints,
    computedGeoJsonLineString,
    departureHub,
    arrivalHub,
    feasibilityVerdict,
    labels,
}: BuildFlightSavePayloadParams): BuildFlightSavePayloadResult {
    const alt = formData.cruisingAltitudeM ?? 120;

    let plannedRoute = computedGeoJsonLineString;
    if (!plannedRoute && departureHub?.location && arrivalHub?.location) {
        plannedRoute = {
            type: "LineString",
            coordinates: [
                [
                    departureHub.location.longitude,
                    departureHub.location.latitude,
                    departureHub.altitudeMsl ?? 0,
                ],
                [
                    arrivalHub.location.longitude,
                    arrivalHub.location.latitude,
                    arrivalHub.altitudeMsl ?? 0,
                ],
            ],
        };
    }

    const basePayload: Record<string, unknown> = {
        droneId: formData.droneId?.trim() || undefined,
        departureHubId: formData.departureHubId?.trim() || undefined,
        arrivalHubId: formData.arrivalHubId?.trim() || undefined,
        pilotId: formData.pilotId?.trim() || undefined,
        cruisingAltitudeM: alt,
        notes: formData.notes?.trim() || undefined,
        scheduledDeparture: formatIsoSafe(formData.scheduledDeparture) || undefined,
        scheduledArrival: formatIsoSafe(formData.scheduledArrival) || undefined,
        plannedRoute: plannedRoute ?? undefined,
        feasibilityOverride: formData.feasibilityOverride?.trim() || undefined,
        feasibilityVerdict,
    };

    const isCreate = mode === "create";
    const rawPayload: Record<string, unknown> = isCreate
        ? {
              ...basePayload,
              flightNumber: formData.flightNumber?.toUpperCase(),
              executionId: formData.executionId?.trim() || undefined,
          }
        : basePayload;

    const schema = isCreate ? createFlightBody : updateFlightBody;
    const validation = validateSchema(schema, rawPayload);
    if (!validation.success) {
        return {
            success: false,
            errors: validation.errors,
            targetTab: determineActiveTabFromFlightErrors(validation.errors),
        };
    }

    const validated = validation.data as Record<string, unknown>;
    const flightWaypoints: FlightWaypoint[] = [
        ...(departureHub?.location
            ? [
                  {
                      sequence: 1,
                      name: labels.departureWpName(departureHub.name || departureHub.code || "Hub"),
                      latitude: departureHub.location.latitude,
                      longitude: departureHub.location.longitude,
                      altitude: departureHub.altitudeMsl ?? 0,
                      actions: { type: WAYPOINT_ACTION_TYPE.TAKEOFF },
                  },
              ]
            : []),
        ...waypoints.map((wp, idx) => ({
            sequence: (departureHub?.location ? 2 : 1) + idx,
            name:
                wp.name?.trim() ||
                labels.defaultWaypointName((departureHub?.location ? 2 : 1) + idx),
            latitude: wp.latitude,
            longitude: wp.longitude,
            altitude: wp.altitude ?? alt,
            actions: wp.actions || { type: WAYPOINT_ACTION_TYPE.FLY_THROUGH },
            conditions: wp.conditions || undefined,
        })),
        ...(arrivalHub?.location
            ? [
                  {
                      sequence: (departureHub?.location ? 2 : 1) + waypoints.length,
                      name: labels.arrivalWpName(arrivalHub.name || arrivalHub.code || "Hub"),
                      latitude: arrivalHub.location.latitude,
                      longitude: arrivalHub.location.longitude,
                      altitude: arrivalHub.altitudeMsl ?? 0,
                      actions: { type: WAYPOINT_ACTION_TYPE.LAND },
                  },
              ]
            : []),
    ];

    return {
        success: true,
        payload: {
            ...validated,
            waypoints: flightWaypoints,
        } as CreateFlightPayload | UpdateFlightPayload,
    };
}

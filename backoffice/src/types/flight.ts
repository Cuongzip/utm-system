import type zod from "zod";
import {
    createFlightBody,
    updateFlightBody,
    getFlightByIdResponse,
    getFlightsResponse,
    getFlightsQueryParams,
    checkFeasibilityResponse,
} from "@/generated/flight";

export interface FlightWaypoint {
    id?: string;
    tempId?: string;
    sequence: number;
    name?: string;
    latitude: number;
    longitude: number;
    altitude: number;
    actions?: Record<string, unknown>;
    conditions?: Record<string, unknown>;
}

export type CreateFlightPayload = zod.infer<typeof createFlightBody> & {
    waypoints?: FlightWaypoint[];
};
export type UpdateFlightPayload = zod.infer<typeof updateFlightBody> & {
    waypoints?: FlightWaypoint[];
};
export type FlightQueryParams = zod.infer<typeof getFlightsQueryParams>;
export type FlightStatus = NonNullable<zod.infer<typeof getFlightByIdResponse>["status"]>;
export type FlightAuthorizationStatus = NonNullable<
    zod.infer<typeof getFlightByIdResponse>["authorizationStatus"]
>;

export const FLIGHT_STATUSES = getFlightByIdResponse.shape.status.unwrap().options;

export const FLIGHT_STATUS = {
    PLANNED: "planned",
    SCHEDULED: "scheduled",
    AUTHORIZED: "authorized",
    ACTIVE: "active",
    COMPLETED: "completed",
    DIVERTED: "diverted",
    EMERGENCY_LANDING: "emergency_landing",
    CANCELLED: "cancelled",
} as const satisfies Record<string, FlightStatus>;

export const FLIGHT_AUTHORIZATION_STATUS = {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
} as const satisfies Record<string, FlightAuthorizationStatus>;

export const EDITABLE_FLIGHT_STATUSES: readonly FlightStatus[] = [
    FLIGHT_STATUS.PLANNED,
    FLIGHT_STATUS.SCHEDULED,
    FLIGHT_STATUS.AUTHORIZED,
] as const;

export const ACTIVE_FLIGHT_STATUSES: readonly FlightStatus[] = [
    FLIGHT_STATUS.ACTIVE,
    FLIGHT_STATUS.DIVERTED,
] as const;

export const CONTROLLABLE_FLIGHT_STATUSES: readonly FlightStatus[] = [
    FLIGHT_STATUS.ACTIVE,
    FLIGHT_STATUS.DIVERTED,
    FLIGHT_STATUS.AUTHORIZED,
] as const;

export const DEFAULT_FLIGHT_STATUS: FlightStatus = FLIGHT_STATUS.PLANNED;

export type FlightFormPayload = Omit<CreateFlightPayload, "plannedRoute"> & {
    cruisingAltitudeM?: number;
    feasibilityOverride?: string;
    waypoints?: FlightWaypoint[];
    plannedRoute?: Record<string, unknown> | null;
};

export function getInitialFlightFormPayload(initialData?: Flight | null): FlightFormPayload {
    const now = new Date();
    const depTime = new Date(now.getTime() + 30 * 60 * 1000);
    const arrTime = new Date(now.getTime() + 90 * 60 * 1000);

    return {
        flightNumber: initialData?.flightNumber || undefined,
        droneId: initialData?.droneId || "",
        departureHubId: initialData?.departureHubId || "",
        arrivalHubId: initialData?.arrivalHubId || "",
        pilotId: initialData?.pilotId || "",
        scheduledDeparture: initialData?.scheduledDeparture
            ? initialData.scheduledDeparture.slice(0, 16)
            : depTime.toISOString().slice(0, 16),
        scheduledArrival: initialData?.scheduledArrival
            ? initialData.scheduledArrival.slice(0, 16)
            : arrTime.toISOString().slice(0, 16),
        cruisingAltitudeM: initialData?.cruisingAltitudeM ?? 120,
        notes: initialData?.notes || "",
        executionId: initialData?.executionId || "",
        feasibilityOverride: initialData?.feasibilityOverride || "",
    };
}

export type Flight = NonNullable<zod.infer<typeof getFlightByIdResponse>> & {
    id: string;
    waypoints?: FlightWaypoint[];
    feasibilityOverride?: string;
};

export type FlightListResponse = Omit<
    NonNullable<zod.infer<typeof getFlightsResponse>>,
    "items"
> & {
    items?: Flight[];
};

export type FeasibilityResult = NonNullable<zod.infer<typeof checkFeasibilityResponse>>;
export type FeasibilityVerdict = NonNullable<FeasibilityResult["verdict"]>;

export interface FeasibilitySolution {
    kind?: string;
    label?: string;
    detail?: string;
}

export interface FeasibilityCheckPayload {
    payloadKg?: number;
    distanceM?: number;
    hoverTimeS?: number;
}

export interface FeasibilityOverridePayload {
    reason: string;
    approvedBy: string;
}

export const CONFORMANCE_STATUSES = [
    "conformant",
    "non_conforming",
    "contingent",
    "unknown",
] as const;
export type ConformanceStatus = (typeof CONFORMANCE_STATUSES)[number];

export const CONFORMANCE_STATUS = {
    CONFORMANT: "conformant",
    NON_CONFORMING: "non_conforming",
    CONTINGENT: "contingent",
    UNKNOWN: "unknown",
} as const satisfies Record<string, ConformanceStatus>;

export interface FlightConformance {
    flightId: string;
    status: ConformanceStatus;
    crossTrackErrorM?: number;
    verticalErrorM?: number;
    corridorRadiusM?: number;
    altitudeBufferM?: number;
    currentLatitude?: number;
    currentLongitude?: number;
    currentAltitude?: number;
    currentSpeed?: number;
    currentHeading?: number;
    lastTelemetryTime?: string;
    lastEvaluatedAt?: string;
    violationsJson?: string;
}

export const FEASIBILITY_VERDICTS = createFlightBody.shape.feasibilityVerdict.unwrap().options;

export const FEASIBILITY_VERDICT = {
    GO: "go",
    MARGINAL: "marginal",
    NO_GO: "no_go",
} as const satisfies Record<string, FeasibilityVerdict>;

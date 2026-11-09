import type zod from "zod";
import {
    createFlightBody,
    updateFlightBody,
    getFlightByIdResponse,
    getFlightsResponse,
    getFlightsQueryParams,
    checkFeasibilityBody,
    checkFeasibilityResponse,
    overrideFeasibilityBody,
    getHistoryQueryParams,
    getHistoryResponse,
} from "@/generated/flight";

export type CreateFlightPayload = zod.infer<typeof createFlightBody>;
export type UpdateFlightPayload = zod.infer<typeof updateFlightBody>;
export type FlightQueryParams = zod.infer<typeof getFlightsQueryParams>;
export type FlightStatus = NonNullable<zod.infer<typeof getFlightByIdResponse>["status"]>;
export type FlightAuthorizationStatus = NonNullable<
    zod.infer<typeof getFlightByIdResponse>["authorizationStatus"]
>;

export const FLIGHT_STATUSES = getFlightByIdResponse.shape.status.unwrap().options;
export const FLIGHT_AUTHORIZATION_STATUSES =
    getFlightByIdResponse.shape.authorizationStatus.unwrap().options;

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
    FLIGHT_STATUS.EMERGENCY_LANDING,
] as const;

export const DEFAULT_FLIGHT_STATUS: FlightStatus = FLIGHT_STATUS.PLANNED;

export type FlightFormPayload = Omit<CreateFlightPayload, "plannedRoute"> & {
    cruisingAltitudeM?: number;
    feasibilityOverride?: string;
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
        feasibilityOverride: (initialData as any)?.feasibilityOverride || "",
    };
}

export type Flight = NonNullable<zod.infer<typeof getFlightByIdResponse>> & {
    id: string;
};

export type FlightListResponse = Omit<
    NonNullable<zod.infer<typeof getFlightsResponse>>,
    "items"
> & {
    items?: Flight[];
};

export type CheckFeasibilityPayload = zod.infer<typeof checkFeasibilityBody>;
export type FeasibilityResult = NonNullable<zod.infer<typeof checkFeasibilityResponse>>;
export type FeasibilityVerdict = NonNullable<FeasibilityResult["verdict"]>;
export type OverrideFeasibilityPayload = zod.infer<typeof overrideFeasibilityBody>;
export type FeasibilityHistoryParams = zod.infer<typeof getHistoryQueryParams>;
export type FeasibilityHistoryResponse = NonNullable<zod.infer<typeof getHistoryResponse>>;
export type FeasibilityHistoryItem = NonNullable<FeasibilityHistoryResponse["items"]>[number];

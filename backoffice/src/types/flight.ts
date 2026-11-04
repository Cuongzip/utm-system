import type zod from "zod";
import type {
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

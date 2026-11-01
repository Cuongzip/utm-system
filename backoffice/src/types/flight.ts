import type zod from "zod";
import type {
    createFlightBody,
    updateFlightBody,
    getFlightByIdResponse,
    getFlightsResponse,
    getFlightsQueryParams,
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

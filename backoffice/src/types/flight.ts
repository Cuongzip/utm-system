import type zod from "zod";
import type {
    createFlightBody,
    updateFlightBody,
    getFlightByIdResponse,
    getFlightsResponse,
    getFlightsQueryParams,
} from "@/generated/flight";
import type { TelemetryPoint } from "./telemetry";

export type { TelemetryPoint };

export type CreateFlightPayload = zod.infer<typeof createFlightBody>;
export type UpdateFlightPayload = zod.infer<typeof updateFlightBody>;
export type FlightQueryParams = zod.infer<typeof getFlightsQueryParams>;
export type FlightStatus = NonNullable<zod.infer<typeof getFlightByIdResponse>["status"]>;
export type FlightAuthorizationStatus = NonNullable<
    zod.infer<typeof getFlightByIdResponse>["authorizationStatus"]
>;
export type FlightConformanceStatus = NonNullable<
    zod.infer<typeof getFlightByIdResponse>["conformanceStatus"]
>;

export type FlightGenerated = NonNullable<zod.infer<typeof getFlightByIdResponse>>;
export type Flight = FlightGenerated & {
    id: string;
};

export type FlightListResponse = Omit<
    NonNullable<zod.infer<typeof getFlightsResponse>>,
    "items"
> & {
    items?: Flight[];
};

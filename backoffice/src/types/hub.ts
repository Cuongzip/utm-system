import type zod from "zod";
import {
    updateHubBody,
    type createHubBody,
    type getHubByIdResponse,
    type getHubsResponse,
    type getHubsQueryParams,
} from "@/generated/hub";

export const HUB_AIRSPACE_DEFAULTS = {
    maxSimultaneousDrones: 10,
    airspaceFloor: 0,
    airspaceCeiling: 120,
    airspaceRadius: 1500,
    altitudeMsl: 12.5,
} as const;

export type CreateHubPayload = zod.infer<typeof createHubBody>;
export type UpdateHubPayload = zod.infer<typeof updateHubBody>;
export type HubQueryParams = zod.infer<typeof getHubsQueryParams>;
export type HubStatus = NonNullable<zod.infer<typeof getHubByIdResponse>["status"]>;
export const HUB_STATUSES = updateHubBody.shape.status.unwrap().options;

export const HUB_STATUS = {
    ACTIVE: "active",
    MAINTENANCE: "maintenance",
    INACTIVE: "inactive",
} as const satisfies Record<string, HubStatus>;

export const ACTIVE_HUB_STATUS: HubStatus = HUB_STATUS.ACTIVE;
export type HubFormPayload = CreateHubPayload & Pick<UpdateHubPayload, "status">;

export type Hub = NonNullable<zod.infer<typeof getHubByIdResponse>> & {
    id: string;
};

export type HubListResponse = Omit<NonNullable<zod.infer<typeof getHubsResponse>>, "items"> & {
    items?: Hub[];
    total?: number;
};

export interface HubOperationalMetrics {
    activeFlights: number;
    stationedDrones: number;
}

export interface HubDraftPreview {
    latitude: number;
    longitude: number;
    airspaceRadius: number;
    airspaceFloor?: number;
    airspaceCeiling?: number;
    code?: string;
    name?: string;
    status?: HubStatus;
}

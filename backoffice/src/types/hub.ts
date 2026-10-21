import type zod from "zod";
import type {
    createHubBody,
    updateHubBody,
    getHubByIdResponse,
    getHubsResponse,
} from "@/generated/hub";

export type CreateHubPayload = zod.infer<typeof createHubBody>;
export type UpdateHubPayload = zod.infer<typeof updateHubBody>;
export type HubStatus = NonNullable<UpdateHubPayload["status"]>;

export type HubGenerated = NonNullable<zod.infer<typeof getHubByIdResponse>>;
export type Hub = HubGenerated & {
    id: string;
};

export type HubListResponse = Omit<NonNullable<zod.infer<typeof getHubsResponse>>, "items"> & {
    items?: Hub[];
};
export type HubLocation = NonNullable<HubGenerated["location"]>;

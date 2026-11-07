import type zod from "zod";
import {
    updateHubBody,
    type createHubBody,
    type getHubByIdResponse,
    type getHubsQueryParams,
} from "@/generated/hub";

export type CreateHubPayload = zod.infer<typeof createHubBody>;
export type UpdateHubPayload = zod.infer<typeof updateHubBody>;
export type HubQueryParams = zod.infer<typeof getHubsQueryParams>;
export type HubStatus = NonNullable<zod.infer<typeof getHubByIdResponse>["status"]>;
export const HUB_STATUSES = updateHubBody.shape.status.unwrap().options;
export const ACTIVE_HUB_STATUS: HubStatus = "active";
export type HubFormPayload = CreateHubPayload & Pick<UpdateHubPayload, "status">;

export type Hub = NonNullable<zod.infer<typeof getHubByIdResponse>> & {
    id: string;
};

export type HubListResponse = {
    items?: Hub[];
    total?: number;
};

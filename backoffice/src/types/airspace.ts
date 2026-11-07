import type zod from "zod";
import {
    createZoneBody,
    updateZoneBody,
    getZoneByIdResponse,
    getAllZonesResponse,
    getAllZonesQueryParams,
    checkPathBody,
    checkPathResponse,
} from "@/generated/airspace";
import type { ConflictAlert } from "./alert";

export type { ConflictAlert };

export type CreateAirspaceZonePayload = zod.infer<typeof createZoneBody>;
export type UpdateAirspaceZonePayload = zod.infer<typeof updateZoneBody>;
export type AirspaceQueryParams = zod.infer<typeof getAllZonesQueryParams>;
export type AirspaceZoneType = NonNullable<zod.infer<typeof createZoneBody>["zoneType"]>;
export type AirspaceZoneStatus = NonNullable<zod.infer<typeof createZoneBody>["status"]>;

export const AIRSPACE_ZONE_TYPES = updateZoneBody.shape.zoneType.unwrap().options;
export const AIRSPACE_ZONE_STATUSES = updateZoneBody.shape.status.unwrap().options;

export type AirspaceZoneFormPayload = Omit<CreateAirspaceZonePayload, "geometry">;

export function getInitialAirspaceFormPayload(
    initialData?: AirspaceZone | null,
    mode: "create" | "edit" = "create"
): AirspaceZoneFormPayload {
    return {
        code: initialData?.code || "",
        name: initialData?.name || "",
        zoneType: initialData?.zoneType || AIRSPACE_ZONE_TYPES[0],
        status: initialData?.status || AIRSPACE_ZONE_STATUSES[0],
        altitudeCeiling: initialData?.altitudeCeiling ?? 120,
        hubId: initialData?.hubId || "",
        description: initialData?.description || "",
    };
}

export type AirspaceZone = NonNullable<zod.infer<typeof getZoneByIdResponse>> & {
    id: string;
};

export type AirspaceZoneListResponse = Omit<
    NonNullable<zod.infer<typeof getAllZonesResponse>>,
    "items"
> & {
    items?: AirspaceZone[];
};

export type CheckPathPayload = zod.infer<typeof checkPathBody>;
export type CheckPathResult = zod.infer<typeof checkPathResponse>;

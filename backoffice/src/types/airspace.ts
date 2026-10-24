import type zod from "zod";
import type {
    createZoneBody,
    updateZoneBody,
    getZoneByIdResponse,
    getAllZonesResponse,
    getAllZonesQueryParams,
    checkPathBody,
    checkPathResponse,
    checkPointBody,
    checkPointResponse,
} from "@/generated/airspace";
import type { ConflictAlert } from "./alert";

export type { ConflictAlert };

export type CreateAirspaceZonePayload = zod.infer<typeof createZoneBody>;
export type UpdateAirspaceZonePayload = zod.infer<typeof updateZoneBody>;
export type AirspaceQueryParams = zod.infer<typeof getAllZonesQueryParams>;
export type AirspaceZoneType = NonNullable<zod.infer<typeof getZoneByIdResponse>["zoneType"]>;
export type AirspaceZoneStatus = NonNullable<zod.infer<typeof getZoneByIdResponse>["status"]>;

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
export type CheckPointPayload = zod.infer<typeof checkPointBody>;
export type CheckPointResult = zod.infer<typeof checkPointResponse>;

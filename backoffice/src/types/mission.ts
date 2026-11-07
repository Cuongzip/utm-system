import type zod from "zod";
import { getMissionByIdResponse, createMissionBody } from "@/generated/mission";
import type {
    updateMissionBody,
    getMissionsResponse,
    getMissionsQueryParams,
    addWaypointBody,
    updateWaypointBody,
    getWaypointsResponseItem,
    reorderWaypointsBody,
    executeMissionBody,
} from "@/generated/mission";

export type CreateMissionPayload = zod.infer<typeof createMissionBody>;
export type UpdateMissionPayload = zod.infer<typeof updateMissionBody>;

export const MISSION_SCHEDULE_TYPES = createMissionBody.shape.scheduleType.unwrap().options;
export type MissionScheduleType = (typeof MISSION_SCHEDULE_TYPES)[number];

export type MissionQueryParams = zod.infer<typeof getMissionsQueryParams>;

export const MISSION_STATUSES = getMissionByIdResponse.shape.status.unwrap().options;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

export const MISSION_STATUS_LABELS: Record<MissionStatus, string> = {
    draft: "Draft",
    scheduled: "Scheduled",
    executing: "Executing",
    paused: "Paused",
    completed: "Completed",
    aborted: "Aborted",
    failed: "Failed",
};

export type MissionFormPayload = CreateMissionPayload;

export function getInitialMissionFormPayload(initialData?: Mission | null): MissionFormPayload {
    return {
        code: initialData?.code || "",
        name: initialData?.name || "",
        description: initialData?.description || "",
        departureHubId: initialData?.departureHubId || "",
        arrivalHubId: initialData?.arrivalHubId || "",
        scheduleType: initialData?.scheduleType || "immediate",
        scheduledAt: initialData?.scheduledAt ? initialData.scheduledAt.slice(0, 16) : "",
    };
}

export type Mission = NonNullable<zod.infer<typeof getMissionByIdResponse>> & {
    id: string;
    code?: string;
};

export type MissionListResponse = Omit<
    NonNullable<zod.infer<typeof getMissionsResponse>>,
    "items"
> & {
    items?: Mission[];
};

export type Waypoint = NonNullable<zod.infer<typeof getWaypointsResponseItem>> & {
    tempId?: string;
};

export interface ProfilePoint {
    id: string;
    label: string;
    altitude: number;
    latitude: number;
    longitude: number;
    isDeparture?: boolean;
    isArrival?: boolean;
    waypoint?: Waypoint;
}

export type AddWaypointPayload = zod.infer<typeof addWaypointBody>;
export type UpdateWaypointPayload = zod.infer<typeof updateWaypointBody>;
export type ReorderWaypointsPayload = zod.infer<typeof reorderWaypointsBody>;
export type ExecuteMissionPayload = zod.infer<typeof executeMissionBody>;

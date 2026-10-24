import type zod from "zod";
import { getMissionByIdResponse } from "@/generated/mission";
import type {
    createMissionBody,
    updateMissionBody,
    getMissionsResponse,
    getMissionsQueryParams,
    addWaypointBody,
    updateWaypointBody,
    getWaypointsResponseItem,
    reorderWaypointsBody,
    executeMissionBody,
    getExecutionsByMissionIdResponse,
    getExecutionByIdResponse,
} from "@/generated/mission";

export type CreateMissionPayload = zod.infer<typeof createMissionBody>;
export type UpdateMissionPayload = zod.infer<typeof updateMissionBody>;
export type MissionScheduleType = NonNullable<CreateMissionPayload["scheduleType"]>;
export type MissionQueryParams = zod.infer<typeof getMissionsQueryParams>;

export type MissionStatus = NonNullable<zod.infer<typeof getMissionByIdResponse>["status"]>;
export const MISSION_STATUSES = getMissionByIdResponse.shape.status.unwrap().options;

export const MISSION_STATUS_LABELS: Record<MissionStatus, string> = {
    draft: "Draft",
    scheduled: "Scheduled",
    executing: "Executing",
    paused: "Paused",
    completed: "Completed",
    aborted: "Aborted",
    failed: "Failed",
};

export type MissionGenerated = NonNullable<zod.infer<typeof getMissionByIdResponse>>;
export type Mission = MissionGenerated & {
    id: string;
};

export type MissionListResponse = Omit<
    NonNullable<zod.infer<typeof getMissionsResponse>>,
    "items"
> & {
    items?: Mission[];
};

export type WaypointGenerated = NonNullable<zod.infer<typeof getWaypointsResponseItem>>;
export type Waypoint = WaypointGenerated & {
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
export type MissionExecution = NonNullable<zod.infer<typeof getExecutionsByMissionIdResponse>>;
export type ExecutionDetails = NonNullable<zod.infer<typeof getExecutionByIdResponse>>;

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
    getExecutionsByMissionIdResponse,
} from "@/generated/mission";

export type CreateMissionPayload = zod.infer<typeof createMissionBody>;
export type UpdateMissionPayload = zod.infer<typeof updateMissionBody>;

export const WAYPOINT_ACTION_TYPES = [
    "takeoff",
    "fly_through",
    "hover",
    "photo",
    "winch_drop",
    "payload_pickup",
    "payload_drop",
    "land",
] as const;
export type WaypointActionType = (typeof WAYPOINT_ACTION_TYPES)[number];

export const WAYPOINT_ACTION_TYPE = {
    TAKEOFF: "takeoff",
    FLY_THROUGH: "fly_through",
    HOVER: "hover",
    PHOTO: "photo",
    WINCH_DROP: "winch_drop",
    PAYLOAD_PICKUP: "payload_pickup",
    PAYLOAD_DROP: "payload_drop",
    LAND: "land",
} as const satisfies Record<string, WaypointActionType>;

export const DEFAULT_WAYPOINT_ACTION: WaypointActionType = WAYPOINT_ACTION_TYPE.FLY_THROUGH;
export const WAYPOINT_ACTION_LABELS: Record<WaypointActionType, string> = {
    takeoff: "Takeoff",
    fly_through: "Fly Through",
    hover: "Hover",
    photo: "Photo",
    winch_drop: "Winch Drop",
    payload_pickup: "Payload Pickup",
    payload_drop: "Payload Drop",
    land: "Landing",
};

export const MISSION_SCHEDULE_TYPES = createMissionBody.shape.scheduleType.unwrap().options;
export type MissionScheduleType = (typeof MISSION_SCHEDULE_TYPES)[number];

export const MISSION_SCHEDULE_TYPE = {
    IMMEDIATE: "immediate",
    SCHEDULED: "scheduled",
} as const satisfies Record<string, MissionScheduleType>;

export const DEFAULT_MISSION_SCHEDULE_TYPE: MissionScheduleType = MISSION_SCHEDULE_TYPE.IMMEDIATE;

export type MissionQueryParams = zod.infer<typeof getMissionsQueryParams>;

export const MISSION_STATUSES = getMissionByIdResponse.shape.status.unwrap().options;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

export const MISSION_STATUS = {
    DRAFT: "draft",
    SCHEDULED: "scheduled",
    EXECUTING: "executing",
    PAUSED: "paused",
    COMPLETED: "completed",
    ABORTED: "aborted",
    FAILED: "failed",
} as const satisfies Record<string, MissionStatus>;

export const DEFAULT_MISSION_STATUS: MissionStatus = MISSION_STATUS.DRAFT;

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
        code: initialData?.code || undefined,
        name: initialData?.name || "",
        description: initialData?.description || "",
        departureHubId: initialData?.departureHubId || "",
        arrivalHubId: initialData?.arrivalHubId || "",
        scheduleType: initialData?.scheduleType || DEFAULT_MISSION_SCHEDULE_TYPE,
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
    actions?: Record<string, unknown>;
    conditions?: Record<string, unknown>;
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

export type AddWaypointPayload = zod.infer<typeof addWaypointBody> & {
    actions?: Record<string, unknown>;
    conditions?: Record<string, unknown>;
};
export type UpdateWaypointPayload = zod.infer<typeof updateWaypointBody> & {
    actions?: Record<string, unknown>;
    conditions?: Record<string, unknown>;
};
export type ReorderWaypointsPayload = zod.infer<typeof reorderWaypointsBody>;

export type ExecuteMissionPayload = Omit<zod.infer<typeof executeMissionBody>, "droneId"> & {
    droneId?: string;
    autoAssign?: boolean;
};

type MissionExecution = NonNullable<zod.infer<typeof getExecutionsByMissionIdResponse>>;

export interface MissionExecutionResult {
    execution?: MissionExecution;
    flight?: {
        id?: string;
        flightNumber?: string;
        status?: string;
    };
    flights?: Array<{
        id?: string;
        flightNumber?: string;
        droneId?: string;
        status?: string;
        departureHubId?: string;
        arrivalHubId?: string;
    }>;
}

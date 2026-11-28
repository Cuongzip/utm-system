import type zod from "zod";
import { getMissionByIdResponse, createMissionBody, addWaypointBody } from "@/generated/mission";
import type {
    updateMissionBody,
    getMissionsResponse,
    getMissionsQueryParams,
    updateWaypointBody,
    getWaypointsResponseItem,
    reorderWaypointsBody,
    executeMissionBody,
    getExecutionsByMissionIdResponse,
    autoPlanHubsBody,
    autoPlanHubsResponse,
    reassignLegDroneBody,
} from "@/generated/mission";

export type CreateMissionPayload = zod.infer<typeof createMissionBody>;
export type UpdateMissionPayload = zod.infer<typeof updateMissionBody>;

export const WAYPOINT_ACTION_TYPES = [
    "takeoff",
    "fly_through",
    "hover",
    "photo",
    "start_video",
    "stop_video",
    "rotate_gimbal",
    "winch_drop",
    "payload_pickup",
    "payload_drop",
    "sound_alert",
    "land",
] as const;
export type WaypointActionType = (typeof WAYPOINT_ACTION_TYPES)[number];

export const WAYPOINT_ACTION_TYPE = {
    TAKEOFF: "takeoff",
    FLY_THROUGH: "fly_through",
    HOVER: "hover",
    PHOTO: "photo",
    START_VIDEO: "start_video",
    STOP_VIDEO: "stop_video",
    ROTATE_GIMBAL: "rotate_gimbal",
    WINCH_DROP: "winch_drop",
    PAYLOAD_PICKUP: "payload_pickup",
    PAYLOAD_DROP: "payload_drop",
    SOUND_ALERT: "sound_alert",
    LAND: "land",
} as const satisfies Record<string, WaypointActionType>;

export const DEFAULT_WAYPOINT_ACTION: WaypointActionType = WAYPOINT_ACTION_TYPE.FLY_THROUGH;
export const WAYPOINT_ACTION_LABELS: Record<WaypointActionType, string> = {
    takeoff: "Takeoff",
    fly_through: "Fly Through",
    hover: "Hover in Place",
    photo: "Take Photo",
    start_video: "Start Video Recording",
    stop_video: "Stop Video Recording",
    rotate_gimbal: "Rotate Camera / Gimbal",
    winch_drop: "Winch Drop",
    payload_pickup: "Payload Pickup",
    payload_drop: "Drop Payload",
    sound_alert: "Sound Alert",
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
    READY: "ready",
    SCHEDULED: "scheduled",
    EXECUTING: "executing",
    PAUSED: "paused",
    COMPLETED: "completed",
    ABORTED: "aborted",
    CANCELLED: "cancelled",
    FAILED: "failed",
} as const satisfies Record<string, MissionStatus>;

export const DEFAULT_MISSION_STATUS: MissionStatus = MISSION_STATUS.DRAFT;

export const EXECUTABLE_MISSION_STATUSES: ReadonlySet<string> = new Set<MissionStatus>([
    MISSION_STATUS.DRAFT,
    MISSION_STATUS.READY,
    MISSION_STATUS.SCHEDULED,
    MISSION_STATUS.COMPLETED,
    MISSION_STATUS.ABORTED,
    MISSION_STATUS.FAILED,
]);

export const WAYPOINT_TYPES = addWaypointBody.shape.waypointType.unwrap().options;
export type WaypointType = (typeof WAYPOINT_TYPES)[number];

export const WAYPOINT_TYPE = {
    COORDINATE: "coordinate",
    HUB: "hub",
} as const satisfies Record<string, WaypointType>;

export const MISSION_STATUS_LABELS: Record<MissionStatus, string> = {
    draft: "Draft",
    ready: "Ready",
    scheduled: "Scheduled",
    executing: "Executing",
    paused: "Paused",
    completed: "Completed",
    aborted: "Aborted",
    cancelled: "Cancelled",
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

export const STOPOVER_TYPES = [
    "none",
    "recharge",
    "battery_swap",
    "relay_handoff",
    "payload_dropoff",
    "payload_pickup",
] as const;
export type StopoverType = (typeof STOPOVER_TYPES)[number];

export const STOPOVER_TYPE = {
    NONE: "none",
    RECHARGE: "recharge",
    BATTERY_SWAP: "battery_swap",
    RELAY_HANDOFF: "relay_handoff",
    PAYLOAD_DROPOFF: "payload_dropoff",
    PAYLOAD_PICKUP: "payload_pickup",
} as const satisfies Record<string, StopoverType>;

export const STOPOVER_TYPE_LABELS: Record<StopoverType, string> = {
    none: "None (Fly-Through)",
    recharge: "Recharge at Hub",
    battery_swap: "Battery Swap",
    relay_handoff: "Relay Handoff",
    payload_dropoff: "Payload Dropoff",
    payload_pickup: "Payload Pickup",
};

export const STOPOVER_DEFAULT_GROUND_TIME: Record<StopoverType, number> = {
    none: 0,
    recharge: 30,
    battery_swap: 10,
    relay_handoff: 10,
    payload_dropoff: 5,
    payload_pickup: 5,
};

export const EXECUTION_MODES = ["same_drone_sequential", "multi_drone_relay"] as const;
export type ExecutionMode = (typeof EXECUTION_MODES)[number];

export const EXECUTION_MODE = {
    SAME_DRONE_SEQUENTIAL: "same_drone_sequential",
    MULTI_DRONE_RELAY: "multi_drone_relay",
} as const satisfies Record<string, ExecutionMode>;

export const EXECUTION_MODE_LABELS: Record<ExecutionMode, string> = {
    same_drone_sequential: "Same Drone (Sequential)",
    multi_drone_relay: "Multi-Drone Relay",
};

export const MISSION_EXECUTION_STATUS = {
    PENDING: "pending",
    IN_PROGRESS: "in_progress",
    PAUSED: "paused",
    COMPLETED: "completed",
    ABORTED: "aborted",
    FAILED: "failed",
} as const;

export interface WaypointStopoverFields {
    waypointType?: WaypointType;
    hubId?: string;
    stopoverType?: StopoverType;
    groundTimeMinutes?: number;
    payloadDeltaKg?: number;
    hoverDurationSec?: number;
}

export type Waypoint = NonNullable<zod.infer<typeof getWaypointsResponseItem>> &
    WaypointStopoverFields & {
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

export type AddWaypointPayload = zod.infer<typeof addWaypointBody> &
    WaypointStopoverFields & {
        actions?: Record<string, unknown>;
        conditions?: Record<string, unknown>;
    };
export type UpdateWaypointPayload = zod.infer<typeof updateWaypointBody> &
    WaypointStopoverFields & {
        actions?: Record<string, unknown>;
        conditions?: Record<string, unknown>;
    };
export type ReorderWaypointsPayload = zod.infer<typeof reorderWaypointsBody>;
export type AutoPlanHubsPayload = zod.infer<typeof autoPlanHubsBody>;
export type AutoPlanHubsResult = zod.infer<typeof autoPlanHubsResponse>;
export type ReassignLegDronePayload = zod.infer<typeof reassignLegDroneBody>;

export interface LegDroneAssignment {
    legIndex: number;
    droneId: string;
}

export type ExecuteMissionPayload = Omit<zod.infer<typeof executeMissionBody>, "droneId"> & {
    droneId?: string;
    autoAssign?: boolean;
    executionMode?: ExecutionMode;
    legAssignments?: LegDroneAssignment[];
    autoSplitByRange?: boolean;
};

export interface ScoredDroneCandidate {
    droneId: string;
    registrationNumber?: string;
    manufacturer?: string;
    model?: string;
    maxPayloadKg?: number;
    batteryCapacityWh?: number;
    estimatedEnergyConsumptionWh?: number;
    batteryMarginPct?: number;
    eligible?: boolean;
    ineligibilityReason?: string;
    finalScore?: number;
}

export interface PlannedLeg {
    legIndex: number;
    departureHubId?: string;
    departureHubName?: string;
    arrivalHubId?: string;
    arrivalHubName?: string;
    stopoverType?: StopoverType;
    groundTimeMinutes?: number;
    distanceMeters: number;
    estimatedDurationSeconds: number;
    payloadWeightKg?: number;
    estimatedEnergyWh: number;
    airspaceSafe: boolean;
    airspaceWarnings?: string[];
    candidateDrones?: ScoredDroneCandidate[];
    recommendedChargingHubs?: Array<{
        id?: string;
        code?: string;
        name?: string;
    }>;
}

export interface MissionExecutionPlan {
    missionId: string;
    missionName?: string;
    recommendedMode: ExecutionMode;
    totalLegs: number;
    totalDistanceMeters: number;
    totalDurationSeconds: number;
    totalEnergyWh: number;
    feasible: boolean;
    warnings?: string[];
    legs: PlannedLeg[];
}

export interface MissionExecutionLeg {
    id: string;
    executionId?: string;
    missionId?: string;
    legIndex: number;
    flightId?: string;
    flightNumber?: string;
    droneId?: string;
    departureHubId?: string;
    arrivalHubId?: string;
    stopoverType?: StopoverType;
    groundTimeMinutes?: number;
    distanceMeters?: number;
    payloadWeightKg?: number;
    estimatedEnergyWh?: number;
    scheduledDeparture?: string;
    scheduledArrival?: string;
    actualDeparture?: string;
    actualArrival?: string;
    dependsOnFlightId?: string;
    status?: string;
}

export type MissionExecution = NonNullable<zod.infer<typeof getExecutionsByMissionIdResponse>> & {
    executionMode?: ExecutionMode;
    primaryDroneId?: string;
    currentLegIndex?: number;
    totalLegs?: number;
    completedLegs?: number;
    currentWaypointIndex?: number;
    completedWaypoints?: number;
    waypointLogs?: Array<Record<string, unknown>>;
    pausedAt?: string;
    abortReason?: string;
    errorMessage?: string;
    triggerType?: string;
    legs?: MissionExecutionLeg[];
};

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

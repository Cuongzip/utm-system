import type zod from "zod";
import {
    getSessionsQueryParams,
    getSessionsResponse,
    getSessionByIdResponse,
    createSessionBody,
    injectScenarioBody,
    injectScenarioResponse,
    getSessionEventsResponseItem,
} from "@/generated/simulation";

export type CreateSimulationSessionPayload = zod.infer<typeof createSessionBody>;
export type InjectScenarioPayload = zod.infer<typeof injectScenarioBody>;
export type InjectScenarioResult = zod.infer<typeof injectScenarioResponse>;

type SimulationSessionGenerated = NonNullable<zod.infer<typeof getSessionByIdResponse>>;

export type SimulationSession = SimulationSessionGenerated & {
    id: string;
};

export const SIMULATION_SESSION_STATUSES = getSessionsQueryParams.shape.status.unwrap().options;
type SimulationStatus = (typeof SIMULATION_SESSION_STATUSES)[number];

export const SIMULATION_STATUS = {
    RUNNING: "running",
    PAUSED: "paused",
    STOPPED: "stopped",
    COMPLETED: "completed",
} as const satisfies Record<string, SimulationStatus>;

export const DEFAULT_SIMULATION_STATUS: SimulationStatus = SIMULATION_STATUS.RUNNING;

export type InjectScenarioType = zod.infer<typeof injectScenarioBody>["scenario"];

export const SIMULATION_SCENARIO = {
    GPS_FAILURE: "gps_failure",
    BATTERY_DRAIN: "battery_drain",
    C2_LOST: "c2_lost",
    MOTOR_FAILURE: "motor_failure",
    GEOFENCE_BREACH: "geofence_breach",
} as const satisfies Record<string, InjectScenarioType>;

export type SimulationEvent = zod.infer<typeof getSessionEventsResponseItem> & {
    configJson?: string;
};

export type SimulationSessionFilterParams = zod.infer<typeof getSessionsQueryParams>;

export type SimulationSessionList = Omit<
    NonNullable<zod.infer<typeof getSessionsResponse>>,
    "items"
> & {
    items: SimulationSession[];
    total: number;
};

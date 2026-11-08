import type zod from "zod";
import {
    getSessionsQueryParams,
    getSessionByIdResponse,
    createSessionBody,
    injectScenarioBody,
    injectScenarioResponse,
    getSessionEventsResponseItem,
} from "@/generated/simulation";

export type CreateSimulationSessionPayload = zod.infer<typeof createSessionBody>;
export type InjectScenarioPayload = zod.infer<typeof injectScenarioBody>;
export type InjectScenarioResult = zod.infer<typeof injectScenarioResponse>;

export type SimulationSessionGenerated = NonNullable<zod.infer<typeof getSessionByIdResponse>>;

export type SimulationSession = SimulationSessionGenerated & {
    id: string;
};

export const SIMULATION_SESSION_STATUSES = getSessionsQueryParams.shape.status.unwrap().options;

export const SIMULATION_STATUS = {
    RUNNING: "running",
    PAUSED: "paused",
    STOPPED: "stopped",
    COMPLETED: "completed",
} as const;

export type SimulationStatus = (typeof SIMULATION_SESSION_STATUSES)[number];
export const DEFAULT_SIMULATION_STATUS: SimulationStatus = SIMULATION_STATUS.RUNNING;

export type SimulationEvent = zod.infer<typeof getSessionEventsResponseItem> & {
    configJson?: string;
};

export interface SimulationSessionList {
    items: SimulationSession[];
    total: number;
}

export interface SimulationSessionFilterParams {
    status?: string;
    droneId?: string;
    flightId?: string;
    search?: string;
    limit?: number;
    offset?: number;
}

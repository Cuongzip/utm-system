import type zod from "zod";
import type {
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

export type SimulationStatus =
    | NonNullable<SimulationSessionGenerated["status"]>
    | "RUNNING"
    | "PAUSED"
    | "STOPPED"
    | "COMPLETED";

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

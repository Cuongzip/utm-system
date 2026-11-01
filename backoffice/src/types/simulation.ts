import type zod from "zod";
import type { getAllSessionsResponseItem, createSessionBody } from "@/generated/simulation";

export type CreateSimulationSessionPayload = zod.infer<typeof createSessionBody>;

export type SimulationSessionGenerated = NonNullable<zod.infer<typeof getAllSessionsResponseItem>>;

export type SimulationSession = SimulationSessionGenerated & {
    id: string;
};

export type SimulationStatus =
    | NonNullable<SimulationSessionGenerated["status"]>
    | "RUNNING"
    | "PAUSED"
    | "STOPPED"
    | "COMPLETED";

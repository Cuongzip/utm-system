import type zod from "zod";
import type {
    predictResponse,
    adviseBody,
    adviseResponse,
    simulateResolutionBody,
    chatBody,
    chatResponse,
    getFlightBriefingResponse,
    assessFlightResponse,
} from "@/generated/intelligence";

export const BRIEFING_VERDICT = {
    GO: "GO",
    CAUTION: "CAUTION",
    GO_WITH_CONDITIONS: "GO_WITH_CONDITIONS",
    NO_GO: "NO_GO",
} as const;

export type BriefingVerdict = (typeof BRIEFING_VERDICT)[keyof typeof BRIEFING_VERDICT];

export type ForesightPrediction = NonNullable<zod.infer<typeof predictResponse>>;
export type ForesightObject = NonNullable<NonNullable<ForesightPrediction["objects"]>[number]>;
export type ForesightFrame = NonNullable<NonNullable<ForesightPrediction["frames"]>[number]>;
export type ForesightPredictedConflict = NonNullable<
    NonNullable<ForesightPrediction["predictedConflicts"]>[number]
>;
export type ForesightAdvisePayload = zod.infer<typeof adviseBody>;
export type ForesightAdvice = NonNullable<zod.infer<typeof adviseResponse>>;
export type ForesightResolutionOption = NonNullable<
    NonNullable<ForesightAdvice["options"]>[number]
>;
export type SimulateResolutionPayload = zod.infer<typeof simulateResolutionBody>;
export type ForesightManeuver = NonNullable<
    NonNullable<SimulateResolutionPayload["maneuvers"]>[number]
>;

export type CopilotChatPayload = zod.infer<typeof chatBody>;
export type CopilotMessage = NonNullable<NonNullable<CopilotChatPayload["messages"]>[number]>;
export type CopilotChatResponse = NonNullable<zod.infer<typeof chatResponse>>;
export type CopilotToolTraceItem = NonNullable<
    NonNullable<CopilotChatResponse["toolTrace"]>[number]
>;
export type CopilotProposedAction = NonNullable<
    NonNullable<CopilotChatResponse["proposedActions"]>[number]
>;

export type FlightBriefing = NonNullable<zod.infer<typeof getFlightBriefingResponse>>;
export type FlightAssessment = NonNullable<zod.infer<typeof assessFlightResponse>>;

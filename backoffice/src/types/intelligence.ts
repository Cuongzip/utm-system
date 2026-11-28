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

export type ForesightPrediction = NonNullable<zod.infer<typeof predictResponse>>;
export type ForesightPredictedConflict = NonNullable<
    NonNullable<ForesightPrediction["predictedConflicts"]>[number]
>;
export type ForesightAdvisePayload = zod.infer<typeof adviseBody>;
export type ForesightAdvice = NonNullable<zod.infer<typeof adviseResponse>>;
export type ForesightResolutionOption = NonNullable<
    NonNullable<ForesightAdvice["options"]>[number]
>;
export type SimulateResolutionPayload = zod.infer<typeof simulateResolutionBody>;

type CopilotChatPayload = zod.infer<typeof chatBody>;
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

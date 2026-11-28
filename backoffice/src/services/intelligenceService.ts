import { apiClient, buildUrl } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type {
    ForesightPrediction,
    ForesightAdvisePayload,
    ForesightAdvice,
    SimulateResolutionPayload,
    CopilotMessage,
    CopilotChatResponse,
    FlightBriefing,
    FlightAssessment,
} from "@/types";

export const intelligenceService = {
    getFlightBriefing: async (flightId: string): Promise<FlightBriefing> => {
        return apiClient<FlightBriefing>(API_ENDPOINTS.INTELLIGENCE.BRIEFING_FLIGHT(flightId));
    },

    assessFlight: async (flightId: string): Promise<FlightAssessment> => {
        return apiClient<FlightAssessment>(API_ENDPOINTS.INTELLIGENCE.BRIEFING_ASSESS(flightId));
    },

    predictForesight: async (horizon = 300, step = 10): Promise<ForesightPrediction> => {
        const url = buildUrl(API_ENDPOINTS.INTELLIGENCE.FORESIGHT_PREDICT, { horizon, step });
        return apiClient<ForesightPrediction>(url);
    },

    adviseForesight: async (payload: ForesightAdvisePayload): Promise<ForesightAdvice> => {
        return apiClient<ForesightAdvice>(API_ENDPOINTS.INTELLIGENCE.FORESIGHT_ADVISE, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    simulateResolution: async (
        payload: SimulateResolutionPayload
    ): Promise<ForesightPrediction> => {
        return apiClient<ForesightPrediction>(API_ENDPOINTS.INTELLIGENCE.FORESIGHT_SIMULATE, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    chatCopilot: async (messages: CopilotMessage[]): Promise<CopilotChatResponse> => {
        return apiClient<CopilotChatResponse>(API_ENDPOINTS.INTELLIGENCE.COPILOT_CHAT, {
            method: "POST",
            body: JSON.stringify({ messages }),
        });
    },

    executeProposedAction: async (
        method: string,
        path: string,
        body?: Record<string, unknown>
    ): Promise<unknown> => {
        const normalizedPath = path.startsWith("/api/api/")
            ? path
            : path.startsWith("/api/")
              ? `/api${path}`
              : `/api/api/v1/${path.replace(/^\/+/, "")}`;
        return apiClient<unknown>(normalizedPath, {
            method: method.toUpperCase(),
            ...(body && Object.keys(body).length > 0 ? { body: JSON.stringify(body) } : {}),
        });
    },
};

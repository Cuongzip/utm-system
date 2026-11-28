import { apiClient, apiClientArray, buildUrl } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type {
    Conflict,
    ConflictQueryParams,
    ResolveConflictPayload,
    ConflictScanResult,
    ConflictResolutionAdvice,
} from "@/types";

export const conflictService = {
    getAll: async (params?: ConflictQueryParams): Promise<Conflict[]> => {
        const url = buildUrl(API_ENDPOINTS.CONFLICTS.BASE, params);
        return apiClientArray<Conflict>(url);
    },

    getActive: async (): Promise<Conflict[]> => {
        return apiClientArray<Conflict>(API_ENDPOINTS.CONFLICTS.ACTIVE);
    },

    getAdvice: async (id: string): Promise<ConflictResolutionAdvice> => {
        return apiClient<ConflictResolutionAdvice>(API_ENDPOINTS.CONFLICTS.ADVICE(id));
    },

    acknowledge: async (id: string): Promise<Conflict> => {
        return apiClient<Conflict>(API_ENDPOINTS.CONFLICTS.ACKNOWLEDGE(id), {
            method: "POST",
        });
    },

    resolve: async (id: string, payload: ResolveConflictPayload): Promise<Conflict> => {
        return apiClient<Conflict>(API_ENDPOINTS.CONFLICTS.RESOLVE(id), {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    evaluate: async (): Promise<ConflictScanResult> => {
        return apiClient<ConflictScanResult>(API_ENDPOINTS.CONFLICTS.EVALUATE, {
            method: "POST",
        });
    },
};

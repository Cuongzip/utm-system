import { apiClient, buildUrl } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type {
    Conflict,
    ConflictQueryParams,
    ResolveConflictPayload,
    ConflictScanResult,
} from "@/types";

export const conflictService = {
    getAll: async (params?: ConflictQueryParams): Promise<Conflict[]> => {
        const url = buildUrl(API_ENDPOINTS.CONFLICTS.BASE, params as Record<string, unknown>);
        const res = await apiClient<Conflict[]>(url);
        return Array.isArray(res) ? res : [];
    },

    getActive: async (): Promise<Conflict[]> => {
        const res = await apiClient<Conflict[]>(API_ENDPOINTS.CONFLICTS.ACTIVE);
        return Array.isArray(res) ? res : [];
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

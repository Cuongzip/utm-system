import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type { ConflictAlert } from "@/types";

export const conflictService = {
    getAlerts: async (): Promise<ConflictAlert[]> => {
        return apiClient<ConflictAlert[]>(API_ENDPOINTS.CONFLICTS.ALERTS);
    },
};

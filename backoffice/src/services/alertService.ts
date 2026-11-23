import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type { AlertVm } from "@/types";

export const alertService = {
    getActiveAlerts: async (): Promise<AlertVm[]> => {
        const res = await apiClient<AlertVm[]>(API_ENDPOINTS.ALERTS.ACTIVE);
        return Array.isArray(res) ? res : [];
    },

    acknowledgeAlert: async (id: string): Promise<AlertVm> => {
        return apiClient<AlertVm>(API_ENDPOINTS.ALERTS.ACKNOWLEDGE(id), {
            method: "POST",
            body: JSON.stringify({}),
        });
    },
};

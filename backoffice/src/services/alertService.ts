import { apiClient, apiClientArray } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type { AlertVm } from "@/types";

export const alertService = {
    getActiveAlerts: async (): Promise<AlertVm[]> => {
        return apiClientArray<AlertVm>(API_ENDPOINTS.ALERTS.ACTIVE);
    },

    acknowledgeAlert: async (id: string): Promise<AlertVm> => {
        return apiClient<AlertVm>(API_ENDPOINTS.ALERTS.ACKNOWLEDGE(id), {
            method: "POST",
            body: JSON.stringify({}),
        });
    },
};

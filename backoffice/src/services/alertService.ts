import { apiClient, buildUrl } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type {
    AlertVm,
    AlertListResponse,
    AlertQueryParams,
    AcknowledgeAlertPayload,
    ResolveAlertPayload,
    CreateAlertPayload,
} from "@/types";

export type GetAlertsParams = AlertQueryParams;

export const alertService = {
    getActiveAlerts: async (): Promise<AlertVm[]> => {
        const res = await apiClient<AlertVm[]>(API_ENDPOINTS.ALERTS.ACTIVE);
        return Array.isArray(res) ? res : [];
    },

    getAlerts: async (params?: AlertQueryParams): Promise<AlertListResponse> => {
        const url = buildUrl(API_ENDPOINTS.ALERTS.BASE, params as Record<string, unknown>);
        return apiClient<AlertListResponse>(url);
    },

    getById: async (id: string): Promise<AlertVm> => {
        return apiClient<AlertVm>(API_ENDPOINTS.ALERTS.BY_ID(id));
    },

    acknowledgeAlert: async (id: string, payload?: AcknowledgeAlertPayload): Promise<AlertVm> => {
        return apiClient<AlertVm>(API_ENDPOINTS.ALERTS.ACKNOWLEDGE(id), {
            method: "POST",
            body: JSON.stringify(payload || {}),
        });
    },

    resolveAlert: async (id: string, payload?: ResolveAlertPayload): Promise<AlertVm> => {
        return apiClient<AlertVm>(API_ENDPOINTS.ALERTS.RESOLVE(id), {
            method: "POST",
            body: JSON.stringify(payload || {}),
        });
    },

    createAlert: async (payload: CreateAlertPayload): Promise<AlertVm> => {
        return apiClient<AlertVm>(API_ENDPOINTS.ALERTS.BASE, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },
};

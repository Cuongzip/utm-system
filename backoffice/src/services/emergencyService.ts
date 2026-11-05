import { apiClient, buildUrl } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type {
    EmergencyStatsVm,
    EmergencyTrendVm,
    EmergencyIncidentVm,
    IncidentPageVm,
    IncidentQueryParams,
    EmergencySystemConfigVm,
    OperationModeVm,
    OperationMode,
    EmergencyProtocolVm,
} from "@/types";

export const emergencyService = {
    getStats: async (params?: { from?: string; to?: string }): Promise<EmergencyStatsVm> => {
        const url = buildUrl(API_ENDPOINTS.EMERGENCY.STATS, params as Record<string, unknown>);
        return apiClient<EmergencyStatsVm>(url);
    },

    getTrends: async (params?: {
        from?: string;
        to?: string;
        interval?: string;
    }): Promise<EmergencyTrendVm[]> => {
        const url = buildUrl(API_ENDPOINTS.EMERGENCY.TRENDS, params as Record<string, unknown>);
        const res = await apiClient<EmergencyTrendVm[]>(url);
        return Array.isArray(res) ? res : [];
    },

    getActiveIncidents: async (): Promise<EmergencyIncidentVm[]> => {
        const res = await apiClient<EmergencyIncidentVm[]>(
            API_ENDPOINTS.EMERGENCY.ACTIVE_INCIDENTS
        );
        return Array.isArray(res) ? res : [];
    },

    getIncidents: async (params?: IncidentQueryParams): Promise<IncidentPageVm> => {
        const url = buildUrl(API_ENDPOINTS.EMERGENCY.INCIDENTS, params as Record<string, unknown>);
        return apiClient<IncidentPageVm>(url);
    },

    confirmIncident: async (id: string, approved: boolean): Promise<EmergencyIncidentVm> => {
        return apiClient<EmergencyIncidentVm>(API_ENDPOINTS.EMERGENCY.CONFIRM_INCIDENT(id), {
            method: "POST",
            body: JSON.stringify({ approved }),
        });
    },

    getConfig: async (): Promise<EmergencySystemConfigVm> => {
        return apiClient<EmergencySystemConfigVm>(API_ENDPOINTS.EMERGENCY.CONFIG);
    },

    setMode: async (mode: OperationMode): Promise<OperationModeVm> => {
        return apiClient<OperationModeVm>(API_ENDPOINTS.EMERGENCY.SET_MODE, {
            method: "PUT",
            body: JSON.stringify({ mode }),
        });
    },

    getProtocols: async (active?: boolean): Promise<EmergencyProtocolVm[]> => {
        const url = buildUrl(
            API_ENDPOINTS.EMERGENCY.PROTOCOLS,
            active !== undefined ? { active } : undefined
        );
        const res = await apiClient<EmergencyProtocolVm[]>(url);
        return Array.isArray(res) ? res : [];
    },
};

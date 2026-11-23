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
    ConfirmIncidentPayload,
} from "@/types";

export const emergencyService = {
    getStats: async (): Promise<EmergencyStatsVm> => {
        return apiClient<EmergencyStatsVm>(API_ENDPOINTS.EMERGENCY.STATS);
    },

    getTrends: async (): Promise<EmergencyTrendVm[]> => {
        const res = await apiClient<EmergencyTrendVm[]>(API_ENDPOINTS.EMERGENCY.TRENDS);
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

    confirmIncident: async (
        id: string,
        payload: ConfirmIncidentPayload
    ): Promise<EmergencyIncidentVm> => {
        return apiClient<EmergencyIncidentVm>(API_ENDPOINTS.EMERGENCY.CONFIRM_INCIDENT(id), {
            method: "POST",
            body: JSON.stringify(payload),
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

    getProtocols: async (): Promise<EmergencyProtocolVm[]> => {
        const res = await apiClient<EmergencyProtocolVm[]>(API_ENDPOINTS.EMERGENCY.PROTOCOLS);
        return Array.isArray(res) ? res : [];
    },
};

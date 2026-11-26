import { apiClient, buildUrl } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type {
    EmergencyStatsVm,
    EmergencyStatsQueryParams,
    EmergencyTrendVm,
    EmergencyTrendsQueryParams,
    EmergencyIncidentVm,
    IncidentPageVm,
    IncidentQueryParams,
    EmergencySystemConfigVm,
    OperationModeVm,
    OperationMode,
    EmergencyProtocolVm,
    ConfirmIncidentPayload,
    ResolveIncidentPayload,
    PendingConfirmationVm,
    BlackboxEntryVm,
    RootCausePayload,
    UpdateEmergencyProtocolPayload,
} from "@/types";

export const emergencyService = {
    getStats: async (params?: EmergencyStatsQueryParams): Promise<EmergencyStatsVm> => {
        const url = buildUrl(API_ENDPOINTS.EMERGENCY.STATS, params as Record<string, unknown>);
        return apiClient<EmergencyStatsVm>(url);
    },

    getTrends: async (params?: EmergencyTrendsQueryParams): Promise<EmergencyTrendVm[]> => {
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

    getIncidentById: async (id: string): Promise<EmergencyIncidentVm> => {
        return apiClient<EmergencyIncidentVm>(API_ENDPOINTS.EMERGENCY.INCIDENT_BY_ID(id));
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

    resolveIncident: async (
        id: string,
        payload?: ResolveIncidentPayload
    ): Promise<EmergencyIncidentVm> => {
        return apiClient<EmergencyIncidentVm>(API_ENDPOINTS.EMERGENCY.RESOLVE_INCIDENT(id), {
            method: "POST",
            body: JSON.stringify(payload ?? {}),
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

    getPendingConfirmations: async (): Promise<PendingConfirmationVm[]> => {
        const res = await apiClient<PendingConfirmationVm[]>(
            API_ENDPOINTS.EMERGENCY.PENDING_CONFIRMATIONS
        );
        return Array.isArray(res) ? res : [];
    },

    getIncidentBlackbox: async (incidentId: string): Promise<BlackboxEntryVm[]> => {
        const res = await apiClient<BlackboxEntryVm[]>(
            API_ENDPOINTS.EMERGENCY.INCIDENT_BLACKBOX(incidentId)
        );
        return Array.isArray(res) ? res : [];
    },

    updateRootCause: async (
        incidentId: string,
        payload: RootCausePayload
    ): Promise<EmergencyIncidentVm> => {
        return apiClient<EmergencyIncidentVm>(
            API_ENDPOINTS.EMERGENCY.INCIDENT_ROOT_CAUSE(incidentId),
            {
                method: "PUT",
                body: JSON.stringify(payload),
            }
        );
    },

    updateProtocol: async (
        protocolId: string,
        payload: UpdateEmergencyProtocolPayload
    ): Promise<EmergencyProtocolVm> => {
        return apiClient<EmergencyProtocolVm>(API_ENDPOINTS.EMERGENCY.PROTOCOL_BY_ID(protocolId), {
            method: "PUT",
            body: JSON.stringify(payload),
        });
    },
};

import { apiClient, apiClientArray, buildUrl } from "./apiClient";
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
        return apiClient<EmergencyStatsVm>(buildUrl(API_ENDPOINTS.EMERGENCY.STATS, params));
    },

    getTrends: async (params?: EmergencyTrendsQueryParams): Promise<EmergencyTrendVm[]> => {
        return apiClientArray<EmergencyTrendVm>(buildUrl(API_ENDPOINTS.EMERGENCY.TRENDS, params));
    },

    getActiveIncidents: async (): Promise<EmergencyIncidentVm[]> => {
        return apiClientArray<EmergencyIncidentVm>(API_ENDPOINTS.EMERGENCY.ACTIVE_INCIDENTS);
    },

    getIncidents: async (params?: IncidentQueryParams): Promise<IncidentPageVm> => {
        return apiClient<IncidentPageVm>(buildUrl(API_ENDPOINTS.EMERGENCY.INCIDENTS, params));
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
        return apiClientArray<EmergencyProtocolVm>(API_ENDPOINTS.EMERGENCY.PROTOCOLS);
    },

    getPendingConfirmations: async (): Promise<PendingConfirmationVm[]> => {
        return apiClientArray<PendingConfirmationVm>(API_ENDPOINTS.EMERGENCY.PENDING_CONFIRMATIONS);
    },

    getIncidentBlackbox: async (incidentId: string): Promise<BlackboxEntryVm[]> => {
        return apiClientArray<BlackboxEntryVm>(
            API_ENDPOINTS.EMERGENCY.INCIDENT_BLACKBOX(incidentId)
        );
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

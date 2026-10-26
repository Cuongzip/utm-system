import { apiClient, buildUrl, normalizeList } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type {
    DeviceRegistration,
    DeviceRegistrationListResponse,
    DeviceRegistrationPayload,
    DeviceQueryParams,
} from "@/types";

export type GetDevicesParams = DeviceQueryParams;

export const connectivityService = {
    getDevices: async (params?: GetDevicesParams): Promise<DeviceRegistrationListResponse> => {
        const url = buildUrl(API_ENDPOINTS.CONNECTIVITY.BASE, params as Record<string, unknown>);
        const res = await apiClient<DeviceRegistrationListResponse | DeviceRegistration[]>(url);
        return normalizeList<DeviceRegistration>(res);
    },

    getOnlineDevices: async (): Promise<DeviceRegistration[]> => {
        return apiClient<DeviceRegistration[]>(API_ENDPOINTS.CONNECTIVITY.ONLINE);
    },

    getDeviceById: async (id: string): Promise<DeviceRegistration> => {
        return apiClient<DeviceRegistration>(API_ENDPOINTS.CONNECTIVITY.BY_ID(id));
    },

    registerDevice: async (payload: DeviceRegistrationPayload): Promise<DeviceRegistration> => {
        return apiClient<DeviceRegistration>(API_ENDPOINTS.CONNECTIVITY.REGISTER, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    sendHeartbeat: async (id: string): Promise<{ success: boolean; connectionStatus: string }> => {
        return apiClient<{ success: boolean; connectionStatus: string }>(
            API_ENDPOINTS.CONNECTIVITY.HEARTBEAT(id),
            {
                method: "POST",
            }
        );
    },

    revokeDevice: async (id: string): Promise<{ message: string }> => {
        return apiClient<{ message: string }>(API_ENDPOINTS.CONNECTIVITY.BY_ID(id), {
            method: "DELETE",
        });
    },

    getStatus: async (): Promise<unknown> => {
        return apiClient<unknown>(API_ENDPOINTS.CONNECTIVITY.STATUS);
    },

    getTelemetryStats: async (): Promise<unknown> => {
        return apiClient<unknown>(API_ENDPOINTS.CONNECTIVITY.TELEMETRY_STATS);
    },

    getCommandStats: async (): Promise<unknown> => {
        return apiClient<unknown>(API_ENDPOINTS.CONNECTIVITY.COMMANDS_STATS);
    },
};

import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type {
  DeviceRegistration,
  DeviceRegistrationListResponse,
  DeviceRegistrationPayload,
} from "@/types";

export const connectivityService = {
  getDevices: async (params?: {
    connectionStatus?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<DeviceRegistrationListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.connectionStatus) searchParams.set("connectionStatus", params.connectionStatus);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.limit !== undefined) searchParams.set("limit", String(params.limit));
    if (params?.offset !== undefined) searchParams.set("offset", String(params.offset));

    const queryString = searchParams.toString();
    const url = queryString
      ? `${API_ENDPOINTS.CONNECTIVITY.BASE}?${queryString}`
      : API_ENDPOINTS.CONNECTIVITY.BASE;

    const res = await apiClient<DeviceRegistrationListResponse | DeviceRegistration[]>(url);
    if (Array.isArray(res)) {
      return {
        items: res,
        total: res.length,
      };
    }
    return res;
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

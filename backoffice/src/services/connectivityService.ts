import { apiClient, buildUrl, normalizeList } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type {
    DeviceRegistration,
    DeviceRegistrationListResponse,
    DeviceRegistrationPayload,
    DeviceQueryParams,
    CaCertificate,
    DeviceCertificate,
    IssuedCertificateBundle,
    TelemetryModeConfig,
    SetTelemetryModePayload,
    SetTelemetryModeResponse,
    TelemetryStats,
    ProtocolStatsResponse,
    CommandStatsResponse,
    ConnectivityStatusResponse,
    ApiKeyInfo,
    CreateApiKeyPayload,
    CreateApiKeyResponse,
} from "@/types";

export const connectivityService = {
    getDevices: async (params?: DeviceQueryParams): Promise<DeviceRegistrationListResponse> => {
        const url = buildUrl(API_ENDPOINTS.CONNECTIVITY.BASE, params as Record<string, unknown>);
        const res = await apiClient<DeviceRegistrationListResponse | DeviceRegistration[]>(url);
        return normalizeList<DeviceRegistration>(res);
    },

    getOnlineDevices: async (): Promise<DeviceRegistration[]> => {
        return apiClient<DeviceRegistration[]>(API_ENDPOINTS.CONNECTIVITY.ONLINE);
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

    getCaCertificate: async (): Promise<CaCertificate> => {
        return apiClient<CaCertificate>(API_ENDPOINTS.CONNECTIVITY.CA_CERTIFICATE);
    },

    getDeviceCertificate: async (deviceId: string): Promise<DeviceCertificate> => {
        return apiClient<DeviceCertificate>(
            API_ENDPOINTS.CONNECTIVITY.DEVICE_CERTIFICATE(deviceId)
        );
    },

    issueDeviceCertificate: async (deviceId: string): Promise<IssuedCertificateBundle> => {
        return apiClient<IssuedCertificateBundle>(
            API_ENDPOINTS.CONNECTIVITY.DEVICE_CERTIFICATE(deviceId),
            {
                method: "POST",
            }
        );
    },

    revokeDeviceCertificate: async (
        deviceId: string,
        reason?: string
    ): Promise<DeviceCertificate> => {
        const url = buildUrl(
            API_ENDPOINTS.CONNECTIVITY.DEVICE_CERTIFICATE(deviceId),
            reason ? { reason } : undefined
        );
        return apiClient<DeviceCertificate>(url, {
            method: "DELETE",
        });
    },

    getTelemetryModes: async (): Promise<TelemetryModeConfig[]> => {
        return apiClient<TelemetryModeConfig[]>(API_ENDPOINTS.CONNECTIVITY.TELEMETRY_MODES);
    },

    setDeviceTelemetryMode: async (
        deviceId: string,
        payload: SetTelemetryModePayload
    ): Promise<SetTelemetryModeResponse> => {
        return apiClient<SetTelemetryModeResponse>(
            API_ENDPOINTS.CONNECTIVITY.DEVICE_TELEMETRY_MODE(deviceId),
            {
                method: "PUT",
                body: JSON.stringify(payload),
            }
        );
    },

    getTelemetryStats: async (): Promise<TelemetryStats> => {
        return apiClient<TelemetryStats>(API_ENDPOINTS.CONNECTIVITY.TELEMETRY_STATS);
    },

    getProtocolStats: async (): Promise<ProtocolStatsResponse> => {
        return apiClient<ProtocolStatsResponse>(API_ENDPOINTS.CONNECTIVITY.PROTOCOLS_STATS);
    },

    getCommandStats: async (): Promise<CommandStatsResponse> => {
        return apiClient<CommandStatsResponse>(API_ENDPOINTS.CONNECTIVITY.COMMANDS_STATS);
    },

    getStatus: async (): Promise<ConnectivityStatusResponse> => {
        return apiClient<ConnectivityStatusResponse>(API_ENDPOINTS.CONNECTIVITY.STATUS);
    },

    listApiKeys: async (): Promise<ApiKeyInfo[]> => {
        return apiClient<ApiKeyInfo[]>(API_ENDPOINTS.INTEGRATION.KEYS);
    },

    createApiKey: async (payload: CreateApiKeyPayload): Promise<CreateApiKeyResponse> => {
        return apiClient<CreateApiKeyResponse>(API_ENDPOINTS.INTEGRATION.KEYS, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    revokeApiKey: async (id: string): Promise<ApiKeyInfo> => {
        return apiClient<ApiKeyInfo>(API_ENDPOINTS.INTEGRATION.REVOKE_KEY(id), {
            method: "POST",
        });
    },
};

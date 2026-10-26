import { apiClient, buildUrl, normalizeList } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type {
    AirspaceZone,
    AirspaceZoneListResponse,
    AirspaceQueryParams,
    CreateAirspaceZonePayload,
    UpdateAirspaceZonePayload,
    CheckPathPayload,
    CheckPathResult,
    CheckPointPayload,
    CheckPointResult,
} from "@/types";

export type GetZonesParams = AirspaceQueryParams;

export const airspaceService = {
    getZones: async (params?: GetZonesParams): Promise<AirspaceZoneListResponse> => {
        const endpoint = buildUrl(API_ENDPOINTS.AIRSPACES.ZONES, params as Record<string, unknown>);
        const res = await apiClient<AirspaceZoneListResponse | AirspaceZone[]>(endpoint);
        return normalizeList<AirspaceZone>(res);
    },

    getZoneById: async (id: string): Promise<AirspaceZone> => {
        return apiClient<AirspaceZone>(API_ENDPOINTS.AIRSPACES.BY_ID(id));
    },

    createZone: async (payload: CreateAirspaceZonePayload): Promise<AirspaceZone> => {
        return apiClient<AirspaceZone>(API_ENDPOINTS.AIRSPACES.ZONES, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    updateZone: async (id: string, payload: UpdateAirspaceZonePayload): Promise<AirspaceZone> => {
        return apiClient<AirspaceZone>(API_ENDPOINTS.AIRSPACES.BY_ID(id), {
            method: "PUT",
            body: JSON.stringify(payload),
        });
    },

    deleteZone: async (id: string): Promise<{ message?: string }> => {
        return apiClient<{ message?: string }>(API_ENDPOINTS.AIRSPACES.BY_ID(id), {
            method: "DELETE",
        });
    },

    checkPath: async (payload: CheckPathPayload): Promise<CheckPathResult> => {
        return apiClient<CheckPathResult>(API_ENDPOINTS.AIRSPACES.CHECK_PATH, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    checkPoint: async (payload: CheckPointPayload): Promise<CheckPointResult> => {
        return apiClient<CheckPointResult>(API_ENDPOINTS.AIRSPACES.CHECK_POINT, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },
};

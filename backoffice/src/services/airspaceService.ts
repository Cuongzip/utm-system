import { apiClient } from "./apiClient";
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
        const query = new URLSearchParams();
        if (params?.hubId) query.set("hubId", params.hubId);
        if (params?.zoneType) query.set("zoneType", params.zoneType);
        if (params?.status) query.set("status", params.status);
        if (params?.limit !== undefined) query.set("limit", String(params.limit));
        if (params?.offset !== undefined) query.set("offset", String(params.offset));

        const queryString = query.toString();
        const endpoint = queryString
            ? `${API_ENDPOINTS.AIRSPACES.ZONES}?${queryString}`
            : API_ENDPOINTS.AIRSPACES.ZONES;

        const res = await apiClient<AirspaceZoneListResponse | AirspaceZone[]>(endpoint);
        if (Array.isArray(res)) {
            return { items: res, total: res.length };
        }
        return res;
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

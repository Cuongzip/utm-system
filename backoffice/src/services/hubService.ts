import { apiClient, buildUrl, normalizeList } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type {
    Hub,
    HubListResponse,
    CreateHubPayload,
    UpdateHubPayload,
    HubQueryParams,
} from "@/types";

export type GetHubsParams = HubQueryParams;

export const hubService = {
    getHubs: async (params?: GetHubsParams): Promise<HubListResponse> => {
        const url = buildUrl(API_ENDPOINTS.HUBS.BASE, params as Record<string, unknown>);
        const res = await apiClient<HubListResponse | Hub[]>(url);
        return normalizeList<Hub>(res);
    },

    getAll: async (): Promise<Hub[]> => {
        const res = await hubService.getHubs({ limit: 0 });
        return res.items || [];
    },

    getById: async (id: string): Promise<Hub> => {
        return apiClient<Hub>(API_ENDPOINTS.HUBS.BY_ID(id));
    },

    createHub: async (payload: CreateHubPayload): Promise<Hub> => {
        return apiClient<Hub>(API_ENDPOINTS.HUBS.BASE, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    updateHub: async (id: string, payload: UpdateHubPayload): Promise<Hub> => {
        return apiClient<Hub>(API_ENDPOINTS.HUBS.BY_ID(id), {
            method: "PUT",
            body: JSON.stringify(payload),
        });
    },

    deleteHub: async (id: string): Promise<void> => {
        return apiClient<void>(API_ENDPOINTS.HUBS.BY_ID(id), {
            method: "DELETE",
        });
    },
};

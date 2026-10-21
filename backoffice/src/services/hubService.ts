import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type { Hub, HubListResponse } from "@/types";

export const hubService = {
  getHubs: async (params?: {
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<HubListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.limit !== undefined) searchParams.set("limit", String(params.limit));
    if (params?.offset !== undefined) searchParams.set("offset", String(params.offset));

    const qs = searchParams.toString();
    const url = qs ? `${API_ENDPOINTS.HUBS.BASE}?${qs}` : API_ENDPOINTS.HUBS.BASE;

    const res = await apiClient<HubListResponse | Hub[]>(url);
    if (Array.isArray(res)) {
      return {
        items: res,
        total: res.length,
      };
    }
    return res;
  },

  getAll: async (): Promise<Hub[]> => {
    const res = await hubService.getHubs({ limit: 0 });
    return res.items || [];
  },

  getById: async (id: string): Promise<Hub> => {
    return apiClient<Hub>(API_ENDPOINTS.HUBS.BY_ID(id));
  },

  createHub: async (payload: import("@/types").CreateHubPayload): Promise<Hub> => {
    return apiClient<Hub>(API_ENDPOINTS.HUBS.BASE, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateHub: async (
    id: string,
    payload: import("@/types").UpdateHubPayload
  ): Promise<Hub> => {
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

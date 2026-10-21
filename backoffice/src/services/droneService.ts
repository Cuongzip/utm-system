import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type { Drone, DroneListResponse, DroneRegistrationPayload } from "@/types";

export const droneService = {
    getDrones: async (params?: {
        status?: string;
        search?: string;
        homeHubId?: string;
        ownerId?: string;
        limit?: number;
        offset?: number;
    }): Promise<DroneListResponse> => {
        const searchParams = new URLSearchParams();
        if (params?.status && params.status !== "ALL") {
            searchParams.set("status", params.status.toLowerCase());
        }
        if (params?.search) searchParams.set("search", params.search);
        if (params?.homeHubId) searchParams.set("homeHubId", params.homeHubId);
        if (params?.ownerId) searchParams.set("ownerId", params.ownerId);
        if (params?.limit !== undefined) searchParams.set("limit", String(params.limit));
        if (params?.offset !== undefined) searchParams.set("offset", String(params.offset));

        const queryString = searchParams.toString();
        const url = queryString
            ? `${API_ENDPOINTS.DRONES.BASE}?${queryString}`
            : API_ENDPOINTS.DRONES.BASE;

        const res = await apiClient<DroneListResponse | Drone[]>(url);
        if (Array.isArray(res)) {
            return {
                items: res,
                total: res.length,
            };
        }
        return res;
    },

    getAll: async (): Promise<Drone[]> => {
        const res = await droneService.getDrones({ limit: 0 });
        return res.items || [];
    },

    getById: async (id: string): Promise<Drone> => {
        return apiClient<Drone>(API_ENDPOINTS.DRONES.BY_ID(id));
    },

    createDrone: async (payload: DroneRegistrationPayload): Promise<Drone> => {
        return apiClient<Drone>(API_ENDPOINTS.DRONES.BASE, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    updateDrone: async (id: string, payload: Partial<DroneRegistrationPayload>): Promise<Drone> => {
        return apiClient<Drone>(API_ENDPOINTS.DRONES.BY_ID(id), {
            method: "PUT",
            body: JSON.stringify(payload),
        });
    },

    deleteDrone: async (id: string): Promise<void> => {
        await apiClient(API_ENDPOINTS.DRONES.BY_ID(id), {
            method: "DELETE",
        });
    },
};

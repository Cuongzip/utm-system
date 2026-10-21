import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type { Flight } from "@/types";

export const flightService = {
    getAll: async (): Promise<Flight[]> => {
        return apiClient<Flight[]>(API_ENDPOINTS.FLIGHTS.BASE);
    },

    getById: async (id: string): Promise<Flight> => {
        return apiClient<Flight>(API_ENDPOINTS.FLIGHTS.BY_ID(id));
    },

    submitPlan: async (plan: Partial<Flight>): Promise<Flight> => {
        return apiClient<Flight>(API_ENDPOINTS.FLIGHTS.SUBMIT_PLAN, {
            method: "POST",
            body: JSON.stringify(plan),
        });
    },
};

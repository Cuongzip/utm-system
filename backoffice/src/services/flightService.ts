import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type { FlightPlan } from "@/types";

export const flightService = {
  getAll: async (): Promise<FlightPlan[]> => {
    return apiClient<FlightPlan[]>(API_ENDPOINTS.FLIGHTS.BASE);
  },

  getById: async (id: string): Promise<FlightPlan> => {
    return apiClient<FlightPlan>(API_ENDPOINTS.FLIGHTS.BY_ID(id));
  },

  submitPlan: async (plan: Partial<FlightPlan>): Promise<FlightPlan> => {
    return apiClient<FlightPlan>(API_ENDPOINTS.FLIGHTS.SUBMIT_PLAN, {
      method: "POST",
      body: JSON.stringify(plan),
    });
  },
};

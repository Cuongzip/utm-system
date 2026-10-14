import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type { Drone } from "@/types";

export const droneService = {
  getAll: async (): Promise<Drone[]> => {
    return apiClient<Drone[]>(API_ENDPOINTS.DRONES.BASE);
  },

  getById: async (id: string): Promise<Drone> => {
    return apiClient<Drone>(API_ENDPOINTS.DRONES.BY_ID(id));
  },
};

import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type { AirspaceZone } from "@/types";

export const airspaceService = {
  getZones: async (): Promise<AirspaceZone[]> => {
    return apiClient<AirspaceZone[]>(API_ENDPOINTS.AIRSPACES.ZONES);
  },
};

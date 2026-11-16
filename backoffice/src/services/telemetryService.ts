import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type { TelemetryRecord } from "@/types";

export const telemetryService = {
    getLatestByFlightId: async (flightId: string): Promise<TelemetryRecord> => {
        return apiClient<TelemetryRecord>(API_ENDPOINTS.TELEMETRY.LATEST_BY_FLIGHT(flightId));
    },

    getLatestByDroneId: async (droneId: string): Promise<TelemetryRecord> => {
        return apiClient<TelemetryRecord>(API_ENDPOINTS.TELEMETRY.LATEST_BY_DRONE(droneId));
    },
};

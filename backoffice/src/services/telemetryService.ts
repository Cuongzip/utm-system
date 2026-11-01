import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type { TelemetryRecord } from "@/types";

export const telemetryService = {
    getLatestByFlightId: async (flightId: string): Promise<TelemetryRecord | null> => {
        try {
            return await apiClient<TelemetryRecord>(
                API_ENDPOINTS.TELEMETRY.LATEST_BY_FLIGHT(flightId)
            );
        } catch {
            return null;
        }
    },

    getLatestByDroneId: async (droneId: string): Promise<TelemetryRecord | null> => {
        try {
            return await apiClient<TelemetryRecord>(
                API_ENDPOINTS.TELEMETRY.LATEST_BY_DRONE(droneId)
            );
        } catch {
            return null;
        }
    },
};

export default telemetryService;

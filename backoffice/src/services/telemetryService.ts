import { apiClient, buildUrl } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type { TelemetryRecord } from "@/types";

export interface TelemetryHistoryQueryParams {
    from?: string;
    to?: string;
}

export const telemetryService = {
    getLatestByFlightId: async (flightId: string): Promise<TelemetryRecord> => {
        return apiClient<TelemetryRecord>(API_ENDPOINTS.TELEMETRY.LATEST_BY_FLIGHT(flightId));
    },

    getHistoryByFlightId: async (
        flightId: string,
        params?: TelemetryHistoryQueryParams
    ): Promise<TelemetryRecord[]> => {
        const url = buildUrl(
            API_ENDPOINTS.TELEMETRY.HISTORY_BY_FLIGHT(flightId),
            params as Record<string, unknown>
        );
        const res = await apiClient<TelemetryRecord[]>(url);
        return Array.isArray(res) ? res : [];
    },

    getLatestByDroneId: async (droneId: string): Promise<TelemetryRecord> => {
        return apiClient<TelemetryRecord>(API_ENDPOINTS.TELEMETRY.LATEST_BY_DRONE(droneId));
    },
};

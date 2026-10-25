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

    getHistoryByFlightId: async (
        flightId: string,
        from?: string,
        to?: string
    ): Promise<TelemetryRecord[]> => {
        try {
            const params = new URLSearchParams();
            if (from) params.set("from", from);
            if (to) params.set("to", to);
            const query = params.toString();
            const url = query
                ? `${API_ENDPOINTS.TELEMETRY.BY_FLIGHT(flightId)}?${query}`
                : API_ENDPOINTS.TELEMETRY.BY_FLIGHT(flightId);
            const res = await apiClient<TelemetryRecord[]>(url);
            return Array.isArray(res) ? res : [];
        } catch {
            return [];
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

    getHistoryByDroneId: async (
        droneId: string,
        from?: string,
        to?: string
    ): Promise<TelemetryRecord[]> => {
        try {
            const params = new URLSearchParams();
            if (from) params.set("from", from);
            if (to) params.set("to", to);
            const query = params.toString();
            const url = query
                ? `${API_ENDPOINTS.TELEMETRY.BY_DRONE(droneId)}?${query}`
                : API_ENDPOINTS.TELEMETRY.BY_DRONE(droneId);
            const res = await apiClient<TelemetryRecord[]>(url);
            return Array.isArray(res) ? res : [];
        } catch {
            return [];
        }
    },
};

export default telemetryService;

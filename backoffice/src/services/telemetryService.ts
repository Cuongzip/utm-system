import { apiClient, buildUrl } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type { TelemetryRecord, TelemetryHistoryQueryParams } from "@/types";

export type GetTelemetryHistoryParams = TelemetryHistoryQueryParams;

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
        params?: GetTelemetryHistoryParams
    ): Promise<TelemetryRecord[]> => {
        try {
            const url = buildUrl(
                API_ENDPOINTS.TELEMETRY.BY_FLIGHT(flightId),
                params as Record<string, unknown>
            );
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
        params?: GetTelemetryHistoryParams
    ): Promise<TelemetryRecord[]> => {
        try {
            const url = buildUrl(
                API_ENDPOINTS.TELEMETRY.BY_DRONE(droneId),
                params as Record<string, unknown>
            );
            const res = await apiClient<TelemetryRecord[]>(url);
            return Array.isArray(res) ? res : [];
        } catch {
            return [];
        }
    },
};

export default telemetryService;

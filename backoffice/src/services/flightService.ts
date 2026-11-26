import { apiClient, buildUrl, normalizeList } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type {
    Flight,
    FlightListResponse,
    FlightQueryParams,
    CreateFlightPayload,
    UpdateFlightPayload,
    FeasibilityCheckPayload,
    FeasibilityOverridePayload,
    FeasibilityResult,
    FlightConformance,
} from "@/types";

export const flightService = {
    getAll: async (): Promise<Flight[]> => {
        const res = await flightService.getFlights({ limit: 0 });
        return res.items ?? [];
    },

    getFlights: async (params?: FlightQueryParams): Promise<FlightListResponse> => {
        const endpoint = buildUrl(API_ENDPOINTS.FLIGHTS.BASE, params as Record<string, unknown>);
        const res = await apiClient<FlightListResponse | Flight[]>(endpoint);
        return normalizeList<Flight>(res);
    },

    getById: async (id: string): Promise<Flight> => {
        return apiClient<Flight>(API_ENDPOINTS.FLIGHTS.BY_ID(id));
    },

    createFlight: async (payload: CreateFlightPayload): Promise<Flight> => {
        return apiClient<Flight>(API_ENDPOINTS.FLIGHTS.BASE, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    updateFlight: async (id: string, payload: UpdateFlightPayload): Promise<Flight> => {
        return apiClient<Flight>(API_ENDPOINTS.FLIGHTS.BY_ID(id), {
            method: "PUT",
            body: JSON.stringify(payload),
        });
    },

    authorizeFlight: async (id: string): Promise<Flight> => {
        return apiClient<Flight>(API_ENDPOINTS.FLIGHTS.AUTHORIZE(id), {
            method: "POST",
        });
    },

    startFlight: async (id: string): Promise<Flight> => {
        return apiClient<Flight>(API_ENDPOINTS.FLIGHTS.START(id), {
            method: "POST",
        });
    },

    completeFlight: async (id: string): Promise<Flight> => {
        return apiClient<Flight>(API_ENDPOINTS.FLIGHTS.COMPLETE(id), {
            method: "POST",
        });
    },

    abortFlight: async (id: string): Promise<Flight> => {
        return apiClient<Flight>(API_ENDPOINTS.FLIGHTS.ABORT(id), {
            method: "POST",
        });
    },

    checkFeasibility: async (
        id: string,
        payload?: FeasibilityCheckPayload
    ): Promise<FeasibilityResult> => {
        return apiClient<FeasibilityResult>(API_ENDPOINTS.FLIGHTS.FEASIBILITY_CHECK(id), {
            method: "POST",
            body: JSON.stringify(payload ?? {}),
        });
    },

    overrideFeasibility: async (
        id: string,
        payload: FeasibilityOverridePayload
    ): Promise<Flight> => {
        return apiClient<Flight>(API_ENDPOINTS.FLIGHTS.FEASIBILITY_OVERRIDE(id), {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    getConformance: async (id: string): Promise<FlightConformance> => {
        return apiClient<FlightConformance>(API_ENDPOINTS.FLIGHTS.CONFORMANCE(id));
    },

    evaluateConformance: async (id: string): Promise<FlightConformance> => {
        return apiClient<FlightConformance>(API_ENDPOINTS.FLIGHTS.CONFORMANCE_EVALUATE(id), {
            method: "POST",
        });
    },
};

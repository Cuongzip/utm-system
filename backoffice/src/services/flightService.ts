import { apiClient, buildUrl, normalizeList } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type {
    Flight,
    FlightListResponse,
    FlightQueryParams,
    CreateFlightPayload,
    UpdateFlightPayload,
    CheckFeasibilityPayload,
    FeasibilityResult,
    OverrideFeasibilityPayload,
    FeasibilityHistoryParams,
    FeasibilityHistoryResponse,
} from "@/types";

export const flightService = {
    getAll: async (): Promise<Flight[]> => {
        const res = await flightService.getFlights({ limit: 0 });
        return res.items || [];
    },

    getFlights: async (params?: FlightQueryParams): Promise<FlightListResponse> => {
        const endpoint = buildUrl(API_ENDPOINTS.FLIGHTS.BASE, params as Record<string, unknown>);
        const res = await apiClient<FlightListResponse | Flight[]>(endpoint);
        return normalizeList<Flight>(res);
    },

    getById: async (id: string): Promise<Flight> => {
        return apiClient<Flight>(API_ENDPOINTS.FLIGHTS.BY_ID(id));
    },

    createFlight: async (payload: CreateFlightPayload | Partial<Flight>): Promise<Flight> => {
        return apiClient<Flight>(API_ENDPOINTS.FLIGHTS.BASE, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    updateFlight: async (
        id: string,
        payload: UpdateFlightPayload | Partial<Flight>
    ): Promise<Flight> => {
        return apiClient<Flight>(API_ENDPOINTS.FLIGHTS.BY_ID(id), {
            method: "PUT",
            body: JSON.stringify(payload),
        });
    },

    authorizeFlight: async (id: string): Promise<Flight> => {
        return apiClient<Flight>(`${API_ENDPOINTS.FLIGHTS.BY_ID(id)}/authorize`, {
            method: "POST",
        });
    },

    startFlight: async (id: string): Promise<Flight> => {
        return apiClient<Flight>(`${API_ENDPOINTS.FLIGHTS.BY_ID(id)}/start`, {
            method: "POST",
        });
    },

    completeFlight: async (id: string): Promise<Flight> => {
        return apiClient<Flight>(`${API_ENDPOINTS.FLIGHTS.BY_ID(id)}/complete`, {
            method: "POST",
        });
    },

    abortFlight: async (id: string): Promise<Flight> => {
        return apiClient<Flight>(`${API_ENDPOINTS.FLIGHTS.BY_ID(id)}/abort`, {
            method: "POST",
        });
    },

    checkFeasibility: async (
        flightId: string,
        payload?: CheckFeasibilityPayload
    ): Promise<FeasibilityResult> => {
        return apiClient<FeasibilityResult>(API_ENDPOINTS.FLIGHTS.CHECK_FEASIBILITY(flightId), {
            method: "POST",
            body: payload ? JSON.stringify(payload) : "{}",
        });
    },

    overrideFeasibility: async (
        flightId: string,
        payload: OverrideFeasibilityPayload
    ): Promise<Flight> => {
        return apiClient<Flight>(API_ENDPOINTS.FLIGHTS.OVERRIDE_FEASIBILITY(flightId), {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    getFeasibilityHistory: async (
        params?: FeasibilityHistoryParams
    ): Promise<FeasibilityHistoryResponse> => {
        const endpoint = buildUrl(
            API_ENDPOINTS.FLIGHTS.FEASIBILITY_HISTORY,
            params as Record<string, unknown>
        );
        return apiClient<FeasibilityHistoryResponse>(endpoint);
    },
};

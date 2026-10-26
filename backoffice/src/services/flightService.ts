import { apiClient, buildUrl, normalizeList } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type {
    Flight,
    FlightListResponse,
    FlightQueryParams,
    CreateFlightPayload,
    UpdateFlightPayload,
} from "@/types";

export type GetFlightsParams = FlightQueryParams;

export const flightService = {
    getAll: async (): Promise<Flight[]> => {
        const res = await flightService.getFlights({ limit: 0 });
        return res.items || [];
    },

    getFlights: async (params?: GetFlightsParams): Promise<FlightListResponse> => {
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

    submitPlan: async (plan: CreateFlightPayload | Partial<Flight>): Promise<Flight> => {
        return apiClient<Flight>(API_ENDPOINTS.FLIGHTS.SUBMIT_PLAN, {
            method: "POST",
            body: JSON.stringify(plan),
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
};

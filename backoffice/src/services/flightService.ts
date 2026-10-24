import { apiClient } from "./apiClient";
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
        const res = await apiClient<FlightListResponse | Flight[]>(API_ENDPOINTS.FLIGHTS.BASE);
        if (Array.isArray(res)) return res;
        return res.items || [];
    },

    getFlights: async (params?: GetFlightsParams): Promise<FlightListResponse> => {
        const query = new URLSearchParams();
        if (params?.status) query.set("status", params.status);
        if (params?.authorizationStatus)
            query.set("authorizationStatus", params.authorizationStatus);
        if (params?.pilotId) query.set("pilotId", params.pilotId);
        if (params?.droneId) query.set("droneId", params.droneId);
        if (params?.limit !== undefined) query.set("limit", String(params.limit));
        if (params?.offset !== undefined) query.set("offset", String(params.offset));

        const queryString = query.toString();
        const endpoint = queryString
            ? `${API_ENDPOINTS.FLIGHTS.BASE}?${queryString}`
            : API_ENDPOINTS.FLIGHTS.BASE;

        const res = await apiClient<FlightListResponse | Flight[]>(endpoint);
        if (Array.isArray(res)) {
            return { items: res, total: res.length };
        }
        return res;
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

import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type {
    SimulationSession,
    SimulationSessionList,
    SimulationSessionFilterParams,
    SimulationEvent,
    CreateSimulationSessionPayload,
    InjectScenarioPayload,
    InjectScenarioResult,
} from "@/types";

export const simulationService = {
    getAll: async (params?: SimulationSessionFilterParams): Promise<SimulationSessionList> => {
        const queryParams = new URLSearchParams();
        if (params?.status) queryParams.set("status", params.status);
        if (params?.droneId) queryParams.set("droneId", params.droneId);
        if (params?.flightId) queryParams.set("flightId", params.flightId);
        if (params?.search) queryParams.set("search", params.search);
        if (params?.limit !== undefined) queryParams.set("limit", String(params.limit));
        if (params?.offset !== undefined) queryParams.set("offset", String(params.offset));

        const queryString = queryParams.toString();
        const url = queryString
            ? `${API_ENDPOINTS.SIMULATION.BASE}?${queryString}`
            : API_ENDPOINTS.SIMULATION.BASE;

        const res = await apiClient<SimulationSessionList | SimulationSession[]>(url);
        if (Array.isArray(res)) {
            return { items: res, total: res.length };
        }
        return {
            items: res?.items || [],
            total: res?.total ?? (res?.items?.length || 0),
        };
    },

    getById: async (id: string): Promise<SimulationSession> => {
        return apiClient<SimulationSession>(API_ENDPOINTS.SIMULATION.BY_ID(id));
    },

    createSession: async (payload: CreateSimulationSessionPayload): Promise<SimulationSession> => {
        return apiClient<SimulationSession>(API_ENDPOINTS.SIMULATION.BASE, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    pauseSession: async (id: string): Promise<SimulationSession> => {
        return apiClient<SimulationSession>(API_ENDPOINTS.SIMULATION.PAUSE(id), {
            method: "PATCH",
        });
    },

    resumeSession: async (id: string): Promise<SimulationSession> => {
        return apiClient<SimulationSession>(API_ENDPOINTS.SIMULATION.RESUME(id), {
            method: "PATCH",
        });
    },

    stopSession: async (id: string): Promise<SimulationSession> => {
        return apiClient<SimulationSession>(API_ENDPOINTS.SIMULATION.STOP(id), {
            method: "POST",
        });
    },

    updateTimeScale: async (id: string, timeScale: number): Promise<SimulationSession> => {
        return apiClient<SimulationSession>(API_ENDPOINTS.SIMULATION.TIME_SCALE(id), {
            method: "PATCH",
            body: JSON.stringify({ timeScale }),
        });
    },

    injectScenario: async (
        id: string,
        payload: InjectScenarioPayload
    ): Promise<InjectScenarioResult> => {
        return apiClient<InjectScenarioResult>(API_ENDPOINTS.SIMULATION.INJECT_SCENARIO(id), {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    getEvents: async (sessionId: string): Promise<SimulationEvent[]> => {
        const res = await apiClient<SimulationEvent[]>(API_ENDPOINTS.SIMULATION.EVENTS(sessionId));
        return Array.isArray(res) ? res : [];
    },

    deleteSession: async (id: string): Promise<void> => {
        await apiClient(API_ENDPOINTS.SIMULATION.BY_ID(id), {
            method: "DELETE",
        });
    },

    powerOnDevice: async (id: string): Promise<void> => {
        await apiClient(API_ENDPOINTS.SIMULATION.DEVICE_POWER_ON(id), {
            method: "POST",
        });
    },

    powerOffDevice: async (id: string): Promise<void> => {
        await apiClient(API_ENDPOINTS.SIMULATION.DEVICE_POWER_OFF(id), {
            method: "POST",
        });
    },
};

import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type { SimulationSession, CreateSimulationSessionPayload } from "@/types";

export const simulationService = {
    getAll: async (): Promise<SimulationSession[]> => {
        const res = await apiClient<SimulationSession[]>(API_ENDPOINTS.SIMULATION.BASE);
        return Array.isArray(res) ? res : [];
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

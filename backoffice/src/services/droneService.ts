import { apiClient, buildUrl, normalizeList } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type {
    Drone,
    DroneListResponse,
    CreateDronePayload,
    UpdateDronePayload,
    DroneQueryParams,
    DroneCommand,
    DroneCommandListResponse,
    DroneCommandQueryParams,
    SendCommandPayload,
} from "@/types";

export const droneService = {
    getDrones: async (params?: DroneQueryParams): Promise<DroneListResponse> => {
        const url = buildUrl(API_ENDPOINTS.DRONES.BASE, params);
        const res = await apiClient<DroneListResponse | Drone[]>(url);
        return normalizeList<Drone>(res);
    },

    getAll: async (): Promise<Drone[]> => {
        const res = await droneService.getDrones({ limit: 0 });
        return res.items ?? [];
    },

    createDrone: async (payload: CreateDronePayload): Promise<Drone> => {
        return apiClient<Drone>(API_ENDPOINTS.DRONES.BASE, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    updateDrone: async (id: string, payload: UpdateDronePayload): Promise<Drone> => {
        return apiClient<Drone>(API_ENDPOINTS.DRONES.BY_ID(id), {
            method: "PUT",
            body: JSON.stringify(payload),
        });
    },

    deleteDrone: async (id: string): Promise<void> => {
        await apiClient(API_ENDPOINTS.DRONES.BY_ID(id), {
            method: "DELETE",
        });
    },

    getCommands: async (
        droneId: string,
        params?: DroneCommandQueryParams
    ): Promise<DroneCommandListResponse> => {
        const url = buildUrl(API_ENDPOINTS.DRONES.COMMANDS(droneId), params);
        return apiClient<DroneCommandListResponse>(url);
    },

    sendCommand: async (droneId: string, payload: SendCommandPayload): Promise<DroneCommand> => {
        return apiClient<DroneCommand>(API_ENDPOINTS.DRONES.COMMANDS(droneId), {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    getCommandsByFlightId: async (flightId: string): Promise<DroneCommand[]> => {
        const res = await apiClient<DroneCommand[] | DroneCommandListResponse>(
            API_ENDPOINTS.COMMANDS.BY_FLIGHT(flightId)
        );
        if (Array.isArray(res)) return res;
        return res?.items ?? [];
    },

    cancelCommand: async (droneId: string, commandId: string): Promise<DroneCommand> => {
        return apiClient<DroneCommand>(API_ENDPOINTS.DRONES.CANCEL_COMMAND(droneId, commandId), {
            method: "POST",
        });
    },
};

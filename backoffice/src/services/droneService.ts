import { apiClient, buildUrl, normalizeList } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type {
    Drone,
    DroneListResponse,
    DroneRegistrationPayload,
    DroneQueryParams,
    DroneCommand,
    DroneCommandListResponse,
    SendCommandPayload,
    CommandStatus,
    CommandType,
} from "@/types";

export type GetDronesParams = DroneQueryParams;

export const droneService = {
    getDrones: async (params?: GetDronesParams): Promise<DroneListResponse> => {
        const url = buildUrl(API_ENDPOINTS.DRONES.BASE, params as Record<string, unknown>);
        const res = await apiClient<DroneListResponse | Drone[]>(url);
        return normalizeList<Drone>(res);
    },

    getAll: async (): Promise<Drone[]> => {
        const res = await droneService.getDrones({ limit: 0 });
        return res.items || [];
    },

    getById: async (id: string): Promise<Drone> => {
        return apiClient<Drone>(API_ENDPOINTS.DRONES.BY_ID(id));
    },

    createDrone: async (payload: DroneRegistrationPayload): Promise<Drone> => {
        return apiClient<Drone>(API_ENDPOINTS.DRONES.BASE, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    updateDrone: async (id: string, payload: Partial<DroneRegistrationPayload>): Promise<Drone> => {
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
        params?: {
            status?: CommandStatus;
            commandType?: CommandType;
            limit?: number;
            offset?: number;
        }
    ): Promise<DroneCommandListResponse> => {
        const url = buildUrl(
            API_ENDPOINTS.DRONES.COMMANDS(droneId),
            params as Record<string, unknown>
        );
        return apiClient<DroneCommandListResponse>(url);
    },

    getActiveCommands: async (droneId: string): Promise<DroneCommand[]> => {
        const res = await apiClient<DroneCommand[]>(API_ENDPOINTS.DRONES.ACTIVE_COMMANDS(droneId));
        return Array.isArray(res) ? res : [];
    },

    sendCommand: async (droneId: string, payload: SendCommandPayload): Promise<DroneCommand> => {
        return apiClient<DroneCommand>(API_ENDPOINTS.DRONES.COMMANDS(droneId), {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    cancelCommand: async (droneId: string, commandId: string): Promise<DroneCommand> => {
        return apiClient<DroneCommand>(API_ENDPOINTS.DRONES.CANCEL_COMMAND(droneId, commandId), {
            method: "POST",
        });
    },
};

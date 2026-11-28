import { apiClient, buildUrl } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type {
    FleetOverview,
    FleetDroneSummary,
    FleetConfig,
    CreateFleetConfigPayload,
    UpdateFleetConfigPayload,
    RebalancingTask,
    RebalancingRecommendation,
    CreateRebalancingPayload,
    ApproveRebalancingPayload,
    CancelRebalancingPayload,
} from "@/types";

export const fleetService = {
    getOverview: async (): Promise<FleetOverview> => {
        return apiClient<FleetOverview>(API_ENDPOINTS.FLEET.OVERVIEW);
    },

    getDronesAtHub: async (hubId: string): Promise<FleetDroneSummary[]> => {
        return apiClient<FleetDroneSummary[]>(API_ENDPOINTS.FLEET.HUB_DRONES(hubId));
    },

    analyzeRebalancing: async (): Promise<RebalancingRecommendation[]> => {
        return apiClient<RebalancingRecommendation[]>(API_ENDPOINTS.FLEET.REBALANCING_ANALYZE);
    },

    getPendingRebalancing: async (): Promise<RebalancingTask[]> => {
        return apiClient<RebalancingTask[]>(API_ENDPOINTS.FLEET.REBALANCING_PENDING);
    },

    getActiveRebalancing: async (): Promise<RebalancingTask[]> => {
        return apiClient<RebalancingTask[]>(API_ENDPOINTS.FLEET.REBALANCING_ACTIVE);
    },

    getRebalancingHistory: async (limit = 20, offset = 0): Promise<RebalancingTask[]> => {
        const url = buildUrl(API_ENDPOINTS.FLEET.REBALANCING_HISTORY, { limit, offset });
        return apiClient<RebalancingTask[]>(url);
    },

    createRebalancing: async (payload: CreateRebalancingPayload): Promise<RebalancingTask> => {
        return apiClient<RebalancingTask>(API_ENDPOINTS.FLEET.REBALANCING, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    approveRebalancing: async (
        id: string,
        payload?: ApproveRebalancingPayload
    ): Promise<RebalancingTask> => {
        return apiClient<RebalancingTask>(API_ENDPOINTS.FLEET.REBALANCING_APPROVE(id), {
            method: "POST",
            body: JSON.stringify(payload ?? {}),
        });
    },

    executeRebalancing: async (id: string): Promise<RebalancingTask> => {
        return apiClient<RebalancingTask>(API_ENDPOINTS.FLEET.REBALANCING_EXECUTE(id), {
            method: "POST",
        });
    },

    completeRebalancing: async (id: string): Promise<RebalancingTask> => {
        return apiClient<RebalancingTask>(API_ENDPOINTS.FLEET.REBALANCING_COMPLETE(id), {
            method: "POST",
        });
    },

    cancelRebalancing: async (
        id: string,
        payload?: CancelRebalancingPayload
    ): Promise<RebalancingTask> => {
        return apiClient<RebalancingTask>(API_ENDPOINTS.FLEET.REBALANCING_CANCEL(id), {
            method: "POST",
            body: JSON.stringify(payload ?? {}),
        });
    },

    getActiveConfig: async (): Promise<FleetConfig> => {
        return apiClient<FleetConfig>(API_ENDPOINTS.FLEET.CONFIG_ACTIVE);
    },

    getAllConfigs: async (): Promise<FleetConfig[]> => {
        return apiClient<FleetConfig[]>(API_ENDPOINTS.FLEET.CONFIG_ALL);
    },

    createConfig: async (payload: CreateFleetConfigPayload): Promise<FleetConfig> => {
        return apiClient<FleetConfig>(API_ENDPOINTS.FLEET.CONFIG_ACTIVE, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    updateConfig: async (id: string, payload: UpdateFleetConfigPayload): Promise<FleetConfig> => {
        return apiClient<FleetConfig>(API_ENDPOINTS.FLEET.CONFIG_BY_ID(id), {
            method: "PUT",
            body: JSON.stringify(payload),
        });
    },

    activateConfig: async (id: string): Promise<FleetConfig> => {
        return apiClient<FleetConfig>(API_ENDPOINTS.FLEET.CONFIG_ACTIVATE(id), {
            method: "POST",
        });
    },
};

import { apiClient, buildUrl, normalizeList } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type {
    Mission,
    MissionListResponse,
    CreateMissionPayload,
    UpdateMissionPayload,
    ExecuteMissionPayload,
    MissionExecution,
    MissionExecutionPlan,
    MissionExecutionResult,
    AddWaypointPayload,
    UpdateWaypointPayload,
    ReorderWaypointsPayload,
    AutoPlanHubsPayload,
    AutoPlanHubsResult,
    ReassignLegDronePayload,
    MissionQueryParams,
    Waypoint,
} from "@/types";

export const missionService = {
    getMissions: async (params?: MissionQueryParams): Promise<MissionListResponse> => {
        const endpoint = buildUrl(API_ENDPOINTS.MISSIONS.BASE, params as Record<string, unknown>);
        const res = await apiClient<MissionListResponse | Mission[]>(endpoint);
        return normalizeList<Mission>(res);
    },

    getById: async (id: string): Promise<Mission> => {
        return apiClient<Mission>(API_ENDPOINTS.MISSIONS.BY_ID(id));
    },

    createMission: async (payload: CreateMissionPayload): Promise<Mission> => {
        return apiClient<Mission>(API_ENDPOINTS.MISSIONS.BASE, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    updateMission: async (id: string, payload: UpdateMissionPayload): Promise<Mission> => {
        return apiClient<Mission>(API_ENDPOINTS.MISSIONS.BY_ID(id), {
            method: "PUT",
            body: JSON.stringify(payload),
        });
    },

    deleteMission: async (id: string): Promise<{ message: string }> => {
        return apiClient<{ message: string }>(API_ENDPOINTS.MISSIONS.BY_ID(id), {
            method: "DELETE",
        });
    },

    duplicateMission: async (id: string): Promise<Mission> => {
        return apiClient<Mission>(API_ENDPOINTS.MISSIONS.DUPLICATE(id), {
            method: "POST",
        });
    },

    scheduleMission: async (id: string): Promise<Mission> => {
        return apiClient<Mission>(API_ENDPOINTS.MISSIONS.SCHEDULE(id), {
            method: "POST",
        });
    },

    unscheduleMission: async (id: string): Promise<Mission> => {
        return apiClient<Mission>(API_ENDPOINTS.MISSIONS.UNSCHEDULE(id), {
            method: "POST",
        });
    },

    getExecutionPlan: async (
        id: string,
        autoSplitByRange = false
    ): Promise<MissionExecutionPlan> => {
        const endpoint = autoSplitByRange
            ? buildUrl(API_ENDPOINTS.MISSIONS.EXECUTION_PLAN(id), { autoSplitByRange: true })
            : API_ENDPOINTS.MISSIONS.EXECUTION_PLAN(id);
        return apiClient<MissionExecutionPlan>(endpoint);
    },

    getExecutions: async (id: string): Promise<MissionExecution[]> => {
        const res = await apiClient<MissionExecution[]>(API_ENDPOINTS.MISSIONS.EXECUTIONS(id));
        return Array.isArray(res) ? res : [];
    },

    executeMission: async (
        id: string,
        payload: ExecuteMissionPayload
    ): Promise<MissionExecutionResult> => {
        return apiClient<MissionExecutionResult>(API_ENDPOINTS.MISSIONS.EXECUTE(id), {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    pauseExecution: async (executionId: string): Promise<MissionExecution> => {
        return apiClient<MissionExecution>(API_ENDPOINTS.MISSIONS.EXECUTION_PAUSE(executionId), {
            method: "POST",
        });
    },

    resumeExecution: async (executionId: string): Promise<MissionExecution> => {
        return apiClient<MissionExecution>(API_ENDPOINTS.MISSIONS.EXECUTION_RESUME(executionId), {
            method: "POST",
        });
    },

    abortExecution: async (executionId: string, reason?: string): Promise<MissionExecution> => {
        return apiClient<MissionExecution>(API_ENDPOINTS.MISSIONS.EXECUTION_ABORT(executionId), {
            method: "POST",
            body: JSON.stringify(reason ? { reason } : {}),
        });
    },

    addWaypoint: async (missionId: string, waypoint: AddWaypointPayload): Promise<Waypoint> => {
        return apiClient<Waypoint>(API_ENDPOINTS.MISSIONS.WAYPOINTS(missionId), {
            method: "POST",
            body: JSON.stringify(waypoint),
        });
    },

    updateWaypoint: async (
        missionId: string,
        waypointId: string,
        waypoint: UpdateWaypointPayload
    ): Promise<Waypoint> => {
        return apiClient<Waypoint>(API_ENDPOINTS.MISSIONS.WAYPOINT_BY_ID(missionId, waypointId), {
            method: "PUT",
            body: JSON.stringify(waypoint),
        });
    },

    deleteWaypoint: async (missionId: string, waypointId: string): Promise<{ message: string }> => {
        return apiClient<{ message: string }>(
            API_ENDPOINTS.MISSIONS.WAYPOINT_BY_ID(missionId, waypointId),
            {
                method: "DELETE",
            }
        );
    },

    reorderWaypoints: async (
        missionId: string,
        payload: ReorderWaypointsPayload
    ): Promise<Waypoint[]> => {
        return apiClient<Waypoint[]>(API_ENDPOINTS.MISSIONS.REORDER_WAYPOINTS(missionId), {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    autoPlanHubs: async (
        missionId: string,
        payload?: AutoPlanHubsPayload
    ): Promise<AutoPlanHubsResult> => {
        return apiClient<AutoPlanHubsResult>(API_ENDPOINTS.MISSIONS.AUTO_PLAN_HUBS(missionId), {
            method: "POST",
            body: JSON.stringify(payload ?? {}),
        });
    },

    reassignLegDrone: async (
        executionId: string,
        legIndex: number,
        payload: ReassignLegDronePayload
    ): Promise<MissionExecution> => {
        return apiClient<MissionExecution>(
            API_ENDPOINTS.MISSIONS.EXECUTION_REASSIGN_LEG(executionId, legIndex),
            {
                method: "POST",
                body: JSON.stringify(payload),
            }
        );
    },
};

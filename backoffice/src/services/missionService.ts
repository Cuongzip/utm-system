import { apiClient, buildUrl, normalizeList } from "./apiClient";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import type {
    Mission,
    MissionListResponse,
    CreateMissionPayload,
    UpdateMissionPayload,
    ExecuteMissionPayload,
    AddWaypointPayload,
    UpdateWaypointPayload,
    ReorderWaypointsPayload,
    MissionQueryParams,
    Waypoint,
} from "@/types";

export type GetMissionsParams = MissionQueryParams;

export const missionService = {
    getMissions: async (params?: GetMissionsParams): Promise<MissionListResponse> => {
        const endpoint = buildUrl(API_ENDPOINTS.MISSIONS.BASE, params as Record<string, unknown>);
        const res = await apiClient<MissionListResponse | Mission[]>(endpoint);
        return normalizeList<Mission>(res);
    },

    getAll: async (): Promise<Mission[]> => {
        const res = await missionService.getMissions({ size: 100 });
        return res.items || [];
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

    executeMission: async (id: string, payload: ExecuteMissionPayload): Promise<unknown> => {
        return apiClient(API_ENDPOINTS.MISSIONS.EXECUTE(id), {
            method: "POST",
            body: JSON.stringify(payload),
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
};

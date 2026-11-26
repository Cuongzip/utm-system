import type zod from "zod";
import type {
    getFleetOverviewResponse,
    getHubStatusResponse,
    getDronesAtHubResponseItem,
    getAvailableDronesResponseItem,
    getActiveConfigResponse,
    createConfigBody,
    updateConfigBody,
    getPendingRebalancingResponseItem,
    analyzeRebalancingResponseItem,
    createRebalancingTaskBody,
    approveRebalancingTaskBody,
    cancelRebalancingTaskBody,
    assignDroneBody,
    assignDroneResponse,
    acceptAssignmentResponse,
} from "@/generated/fleet";

export const REBALANCING_STATUS = {
    PENDING: "pending",
    APPROVED: "approved",
    IN_PROGRESS: "in_progress",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
    FAILED: "failed",
} as const;

export type RebalancingStatus = (typeof REBALANCING_STATUS)[keyof typeof REBALANCING_STATUS];

export type FleetOverview = NonNullable<zod.infer<typeof getFleetOverviewResponse>>;
export type HubFleetStatus = NonNullable<zod.infer<typeof getHubStatusResponse>>;
export type FleetDroneSummary = NonNullable<zod.infer<typeof getDronesAtHubResponseItem>>;
export type FleetAvailabilityItem = NonNullable<zod.infer<typeof getAvailableDronesResponseItem>>;
export type FleetConfig = NonNullable<zod.infer<typeof getActiveConfigResponse>>;
export type FleetConfigWeights = NonNullable<FleetConfig["weights"]>;
export type FleetConfigThresholds = NonNullable<FleetConfig["thresholds"]>;
export type CreateFleetConfigPayload = zod.infer<typeof createConfigBody>;
export type UpdateFleetConfigPayload = zod.infer<typeof updateConfigBody>;
export type RebalancingTask = NonNullable<zod.infer<typeof getPendingRebalancingResponseItem>>;
export type RebalancingRecommendation = NonNullable<
    zod.infer<typeof analyzeRebalancingResponseItem>
>;
export type CreateRebalancingPayload = zod.infer<typeof createRebalancingTaskBody>;
export type ApproveRebalancingPayload = zod.infer<typeof approveRebalancingTaskBody>;
export type CancelRebalancingPayload = zod.infer<typeof cancelRebalancingTaskBody>;
export type AssignDronePayload = zod.infer<typeof assignDroneBody>;
export type AssignDroneResult = NonNullable<zod.infer<typeof assignDroneResponse>>;
export type DroneAssignment = NonNullable<zod.infer<typeof acceptAssignmentResponse>>;

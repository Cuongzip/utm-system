import type zod from "zod";
import type {
    getFleetOverviewResponse,
    getHubStatusResponse,
    getDronesAtHubResponseItem,
    getActiveConfigResponse,
    createConfigBody,
    updateConfigBody,
    getPendingRebalancingResponseItem,
    analyzeRebalancingResponseItem,
    createRebalancingTaskBody,
    approveRebalancingTaskBody,
    cancelRebalancingTaskBody,
} from "@/generated/fleet";

export const REBALANCING_STATUS = {
    PENDING: "pending",
    APPROVED: "approved",
    IN_PROGRESS: "in_progress",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
    FAILED: "failed",
} as const;

export type FleetOverview = NonNullable<zod.infer<typeof getFleetOverviewResponse>>;
export type HubFleetStatus = NonNullable<zod.infer<typeof getHubStatusResponse>>;
export type FleetDroneSummary = NonNullable<zod.infer<typeof getDronesAtHubResponseItem>>;
export type FleetConfig = NonNullable<zod.infer<typeof getActiveConfigResponse>>;
export type CreateFleetConfigPayload = zod.infer<typeof createConfigBody>;
export type UpdateFleetConfigPayload = zod.infer<typeof updateConfigBody>;
export type RebalancingTask = NonNullable<zod.infer<typeof getPendingRebalancingResponseItem>>;
export type RebalancingRecommendation = NonNullable<
    zod.infer<typeof analyzeRebalancingResponseItem>
>;
export type CreateRebalancingPayload = zod.infer<typeof createRebalancingTaskBody>;
export type ApproveRebalancingPayload = zod.infer<typeof approveRebalancingTaskBody>;
export type CancelRebalancingPayload = zod.infer<typeof cancelRebalancingTaskBody>;

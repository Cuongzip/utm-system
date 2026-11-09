import type zod from "zod";
import {
    getAllConflictsQueryParams,
    getConflictByIdResponse,
    resolveConflictBody,
    evaluateConflictsResponse,
} from "@/generated/conflict";

export const CONFLICT_TYPES = getConflictByIdResponse.shape.conflictType.unwrap().options;
export const CONFLICT_SEVERITIES = getConflictByIdResponse.shape.severity.unwrap().options;
export const CONFLICT_STATUSES = getConflictByIdResponse.shape.status.unwrap().options;
export const RESOLUTION_STRATEGIES =
    getConflictByIdResponse.shape.resolutionStrategy.unwrap().options;

export const CONFLICT_SEVERITY = {
    EMERGENCY: "emergency",
    CRITICAL: "critical",
    WARNING: "warning",
    HIGH: "high",
    MEDIUM: "medium",
    LOW: "low",
} as const satisfies Record<string, (typeof CONFLICT_SEVERITIES)[number]>;

export const DEFAULT_CONFLICT_SEVERITY = CONFLICT_SEVERITY.WARNING;

export const CONFLICT_STATUS = {
    DETECTED: "detected",
    NOTIFIED: "notified",
    ACKNOWLEDGED: "acknowledged",
    RESOLVING: "resolving",
    RESOLVED: "resolved",
    DISMISSED: "dismissed",
} as const satisfies Record<string, (typeof CONFLICT_STATUSES)[number]>;

export const RESOLUTION_STRATEGY = {
    HOVER: "hover",
    REROUTE: "reroute",
    DIVERT_ALTITUDE: "divert_altitude",
    RETURN_TO_BASE: "return_to_base",
    SPEED_ADJUSTMENT: "speed_adjustment",
    ALTITUDE_CHANGE: "altitude_change",
    HOLD: "hold",
    AUTO_CLEARED: "auto_cleared",
} as const satisfies Record<string, (typeof RESOLUTION_STRATEGIES)[number]>;

export type ConflictQueryParams = zod.infer<typeof getAllConflictsQueryParams>;
export type ConflictScanResult = zod.infer<typeof evaluateConflictsResponse>;
export type ResolveConflictPayload = zod.infer<typeof resolveConflictBody>;

export type ConflictType = (typeof CONFLICT_TYPES)[number];
export type ConflictSeverity = (typeof CONFLICT_SEVERITIES)[number];
export type ConflictStatus = (typeof CONFLICT_STATUSES)[number];
export type ResolutionStrategy = (typeof RESOLUTION_STRATEGIES)[number];

export type Conflict = NonNullable<zod.infer<typeof getConflictByIdResponse>> & {
    id: string;
};

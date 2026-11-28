import type zod from "zod";
import {
    getIncidentResponse,
    getIncidentsResponse,
    getIncidentsQueryParams,
    getStatsQueryParams,
    getStatsResponse,
    getTrendsQueryParams,
    getTrendsResponseItem,
    getConfigResponse,
    setModeBody,
    getProtocolsResponseItem,
    updateProtocolBody,
    confirmIncidentBody,
    resolveIncidentBody,
    updateRootCauseBody,
    getIncidentBlackboxResponseItem,
} from "@/generated/emergency";

export const RESPONSE_ACTIONS = getIncidentResponse.shape.responseAction.unwrap().options;
export const ROOT_CAUSES = updateRootCauseBody.shape.rootCause.options;
export const EMERGENCY_TYPES = getIncidentResponse.shape.emergencyType.unwrap().options;
export const EMERGENCY_SEVERITIES = getIncidentResponse.shape.severity.unwrap().options;
export const INCIDENT_STATUSES = getIncidentResponse.shape.status.unwrap().options;

export type EmergencySeverity = NonNullable<zod.infer<typeof getIncidentResponse>["severity"]>;
export type EmergencyType = NonNullable<zod.infer<typeof getIncidentResponse>["emergencyType"]>;
export type IncidentStatus = NonNullable<zod.infer<typeof getIncidentResponse>["status"]>;
export type ResponseAction = NonNullable<zod.infer<typeof getIncidentResponse>["responseAction"]>;
export type OperationMode = NonNullable<zod.infer<typeof setModeBody>["mode"]>;
export type RootCause = (typeof ROOT_CAUSES)[number];

export const INCIDENT_STATUS = {
    ACTIVE: "active",
    PENDING_CONFIRMATION: "pending_confirmation",
    EXECUTING: "executing",
    RESOLVED: "resolved",
    REJECTED: "rejected",
    ESCALATED: "escalated",
} as const satisfies Record<string, IncidentStatus>;

export const CLOSED_INCIDENT_STATUSES: readonly IncidentStatus[] = [
    INCIDENT_STATUS.RESOLVED,
    INCIDENT_STATUS.REJECTED,
] as const;

export const DEFAULT_INCIDENT_STATUS: IncidentStatus = INCIDENT_STATUS.ACTIVE;

export const EMERGENCY_SEVERITY = {
    WARNING: "warning",
    CRITICAL: "critical",
    EMERGENCY: "emergency",
} as const satisfies Record<string, EmergencySeverity>;

export const OPERATION_MODE = {
    AUTO: "auto",
    SUPERVISED: "supervised",
} as const satisfies Record<string, OperationMode>;

export const DEFAULT_OPERATION_MODE: OperationMode = OPERATION_MODE.SUPERVISED;

export const RESPONSE_ACTION = {
    RTH: "RTH",
    LAND: "LAND",
    HOVER: "HOVER",
    DIVERT: "DIVERT",
    DESCEND: "DESCEND",
    CLIMB: "CLIMB",
    ESTOP: "ESTOP",
    NONE: "NONE",
} as const satisfies Record<string, ResponseAction>;

export type ConfirmIncidentPayload = zod.infer<typeof confirmIncidentBody>;
export type ResolveIncidentPayload = zod.infer<typeof resolveIncidentBody>;
export type RootCausePayload = zod.infer<typeof updateRootCauseBody>;
export type UpdateEmergencyProtocolPayload = zod.infer<typeof updateProtocolBody>;

type EmergencyIncidentGenerated = NonNullable<zod.infer<typeof getIncidentResponse>>;

export type EmergencyIncidentVm = EmergencyIncidentGenerated & {
    id: string;
    droneId: string;
    emergencyType: EmergencyType;
    severity: EmergencySeverity;
    status: IncidentStatus;
};

export type IncidentPageVm = Omit<NonNullable<zod.infer<typeof getIncidentsResponse>>, "data"> & {
    data: EmergencyIncidentVm[];
};

type EmergencyStatsVmGenerated = NonNullable<zod.infer<typeof getStatsResponse>>;

type StatusCountVm = Omit<
    NonNullable<EmergencyStatsVmGenerated["byStatus"]>[number],
    "status" | "count"
> & {
    status: string;
    count: number;
};

type TypeCountVm = Omit<
    NonNullable<EmergencyStatsVmGenerated["byType"]>[number],
    "type" | "count"
> & {
    type: string;
    count: number;
};

type SeverityCountVm = Omit<
    NonNullable<EmergencyStatsVmGenerated["bySeverity"]>[number],
    "severity" | "count"
> & {
    severity: string;
    count: number;
};

type DroneCountVm = Omit<
    NonNullable<EmergencyStatsVmGenerated["byDrone"]>[number],
    "droneId" | "count"
> & {
    droneId: string;
    count: number;
};

type ResolutionStatVm = Omit<
    NonNullable<EmergencyStatsVmGenerated["resolutionStats"]>[number],
    "count"
> & {
    success?: boolean;
    count: number;
};

export type EmergencyStatsVm = Omit<
    EmergencyStatsVmGenerated,
    "byStatus" | "byType" | "bySeverity" | "byDrone" | "resolutionStats"
> & {
    byStatus?: StatusCountVm[];
    byType?: TypeCountVm[];
    bySeverity?: SeverityCountVm[];
    byDrone?: DroneCountVm[];
    resolutionStats?: ResolutionStatVm[];
};

export type EmergencyTrendVm = NonNullable<zod.infer<typeof getTrendsResponseItem>>;
export type EmergencySystemConfigVm = NonNullable<zod.infer<typeof getConfigResponse>>;
export type OperationModeVm = zod.infer<typeof setModeBody>;

export const ROOT_CAUSE = {
    EQUIPMENT: "equipment",
    WEATHER: "weather",
    PILOT_ERROR: "pilot_error",
    SOFTWARE: "software",
    EXTERNAL: "external",
    UNKNOWN: "unknown",
} as const satisfies Record<string, RootCause>;

export type BlackboxEntryVm = NonNullable<zod.infer<typeof getIncidentBlackboxResponseItem>> & {
    id: string;
    timestamp: string;
};

export type EmergencyProtocolVm = NonNullable<zod.infer<typeof getProtocolsResponseItem>> & {
    id: string;
    name: string;
    emergencyType: EmergencyType;
    severity: EmergencySeverity;
    responseAction: ResponseAction;
    isActive: boolean;
};

export type IncidentQueryParams = Partial<zod.infer<typeof getIncidentsQueryParams>>;
export type EmergencyStatsQueryParams = Partial<zod.infer<typeof getStatsQueryParams>>;
export type EmergencyTrendsQueryParams = Partial<zod.infer<typeof getTrendsQueryParams>>;

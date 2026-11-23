import type zod from "zod";
import {
    getIncidentResponse,
    getIncidentsResponse,
    getIncidentsQueryParams,
    getStatsResponse,
    getTrendsResponseItem,
    getConfigResponse,
    setModeBody,
    getProtocolsResponseItem,
    confirmIncidentBody,
} from "@/generated/emergency";

const INCIDENT_STATUSES = getIncidentResponse.shape.status.unwrap().options;
const EMERGENCY_SEVERITIES = getIncidentResponse.shape.severity.unwrap().options;
const RESPONSE_ACTIONS = getIncidentResponse.shape.responseAction.unwrap().options;
const OPERATION_MODES = setModeBody.shape.mode.options;

export const INCIDENT_STATUS = {
    ACTIVE: "active",
    PENDING_CONFIRMATION: "pending_confirmation",
    EXECUTING: "executing",
    RESOLVED: "resolved",
    ESCALATED: "escalated",
} as const satisfies Record<string, (typeof INCIDENT_STATUSES)[number]>;

export const ACTIVE_INCIDENT_STATUSES: readonly IncidentStatus[] = [
    INCIDENT_STATUS.ACTIVE,
    INCIDENT_STATUS.EXECUTING,
] as const;

export const DEFAULT_INCIDENT_STATUS: IncidentStatus = INCIDENT_STATUS.ACTIVE;

export const EMERGENCY_SEVERITY = {
    WARNING: "warning",
    CRITICAL: "critical",
    EMERGENCY: "emergency",
} as const satisfies Record<string, (typeof EMERGENCY_SEVERITIES)[number]>;

export const OPERATION_MODE = {
    AUTO: "auto",
    SUPERVISED: "supervised",
} as const satisfies Record<string, (typeof OPERATION_MODES)[number]>;

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
} as const satisfies Record<string, (typeof RESPONSE_ACTIONS)[number]>;

export type EmergencySeverity = NonNullable<zod.infer<typeof getIncidentResponse>["severity"]>;
export type EmergencyType = NonNullable<zod.infer<typeof getIncidentResponse>["emergencyType"]>;
export type IncidentStatus = NonNullable<zod.infer<typeof getIncidentResponse>["status"]>;
export type ResponseAction = NonNullable<zod.infer<typeof getIncidentResponse>["responseAction"]>;
export type OperationMode = NonNullable<zod.infer<typeof setModeBody>["mode"]>;

export type ConfirmIncidentPayload = zod.infer<typeof confirmIncidentBody>;

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

export type EmergencyProtocolVm = NonNullable<zod.infer<typeof getProtocolsResponseItem>> & {
    id: string;
    name: string;
    emergencyType: EmergencyType;
    severity: EmergencySeverity;
    responseAction: ResponseAction;
    isActive: boolean;
};

export type IncidentQueryParams = zod.infer<typeof getIncidentsQueryParams>;

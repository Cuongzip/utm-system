import type zod from "zod";
import type {
    getIncidentResponse,
    getIncidentsResponse,
    getIncidentsQueryParams,
    getStatsResponse,
    getTrendsResponseItem,
    getConfigResponse,
    setModeBody,
    getProtocolsResponseItem,
} from "@/generated/emergency";

export type EmergencySeverity = NonNullable<zod.infer<typeof getIncidentResponse>["severity"]>;

export type EmergencyType = NonNullable<zod.infer<typeof getIncidentResponse>["emergencyType"]>;

export type IncidentStatus = NonNullable<zod.infer<typeof getIncidentResponse>["status"]>;

export type ResponseAction = NonNullable<zod.infer<typeof getIncidentResponse>["responseAction"]>;

export type OperationMode = NonNullable<zod.infer<typeof setModeBody>["mode"]>;

export type EmergencyIncidentGenerated = NonNullable<zod.infer<typeof getIncidentResponse>>;

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

export type EmergencyStatsVmGenerated = NonNullable<zod.infer<typeof getStatsResponse>>;

export type StatusCountVm = Omit<
    NonNullable<EmergencyStatsVmGenerated["byStatus"]>[number],
    "status" | "count"
> & {
    status: string;
    count: number;
};

export type TypeCountVm = Omit<
    NonNullable<EmergencyStatsVmGenerated["byType"]>[number],
    "type" | "count"
> & {
    type: string;
    count: number;
};

export type SeverityCountVm = Omit<
    NonNullable<EmergencyStatsVmGenerated["bySeverity"]>[number],
    "severity" | "count"
> & {
    severity: string;
    count: number;
};

export type DroneCountVm = Omit<
    NonNullable<EmergencyStatsVmGenerated["byDrone"]>[number],
    "droneId" | "count"
> & {
    droneId: string;
    count: number;
};

export type ResolutionStatVm = Omit<
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

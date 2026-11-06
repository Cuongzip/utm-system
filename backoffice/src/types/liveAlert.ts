import type { EmergencyIncidentVm, EmergencyProtocolVm } from "./emergency";

export type LiveAlertSeverity =
    "EMERGENCY" | "CRITICAL" | "HIGH" | "WARNING" | "MEDIUM" | "LOW" | "INFO";

export type LiveAlertSource = "alert" | "emergency";

export interface LiveAlertItem {
    id: string;
    source: LiveAlertSource;
    severity: LiveAlertSeverity;
    title: string;
    message: string;
    droneId?: string;
    flightId?: string;
    hubId?: string;
    status?: string;
    timestamp: string;
    actionUrl: string;
    actionLabel: string;
    raw?: unknown;
}

export interface PendingConfirmationVm {
    incidentId: string;
    incident: EmergencyIncidentVm;
    protocol: EmergencyProtocolVm;
    timeoutAt: string;
}

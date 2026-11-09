import type { EmergencyIncidentVm, EmergencyProtocolVm } from "./emergency";

export const LIVE_ALERT_SEVERITY = {
    EMERGENCY: "EMERGENCY",
    CRITICAL: "CRITICAL",
    HIGH: "HIGH",
    WARNING: "WARNING",
    MEDIUM: "MEDIUM",
    LOW: "LOW",
    INFO: "INFO",
} as const;

export type LiveAlertSeverity = (typeof LIVE_ALERT_SEVERITY)[keyof typeof LIVE_ALERT_SEVERITY];

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

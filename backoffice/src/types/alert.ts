import type zod from "zod";
import type { getAlertsResponse, acknowledgeAlertBody } from "@/generated/alert";

export type AlertItemGenerated = NonNullable<
    NonNullable<zod.infer<typeof getAlertsResponse>>["content"]
>[number];

export type AlertVm = AlertItemGenerated & {
    id: string;
};

export type ConflictAlert = AlertVm;

export const ALERT_STATUS = {
    ACTIVE: "ACTIVE",
    ACKNOWLEDGED: "ACKNOWLEDGED",
    RESOLVED: "RESOLVED",
    DISMISSED: "DISMISSED",
} as const;

export type AlertStatus = (typeof ALERT_STATUS)[keyof typeof ALERT_STATUS];

export const ALERT_SEVERITY = {
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
    CRITICAL: "CRITICAL",
} as const;

export type AlertSeverity = (typeof ALERT_SEVERITY)[keyof typeof ALERT_SEVERITY];

export type AcknowledgeAlertPayload = zod.infer<typeof acknowledgeAlertBody>;

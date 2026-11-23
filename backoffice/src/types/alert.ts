import type zod from "zod";
import type { getAlertsResponse } from "@/generated/alert";

type AlertItemGenerated = NonNullable<
    NonNullable<zod.infer<typeof getAlertsResponse>>["content"]
>[number];

export type AlertVm = AlertItemGenerated & {
    id: string;
};

export const ALERT_STATUS = {
    ACTIVE: "ACTIVE",
    ACKNOWLEDGED: "ACKNOWLEDGED",
    RESOLVED: "RESOLVED",
    DISMISSED: "DISMISSED",
} as const;

export const ALERT_SEVERITY = {
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
    CRITICAL: "CRITICAL",
} as const;

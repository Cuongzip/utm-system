import type zod from "zod";
import type { createAlertBody, getAlertsResponse, getAlertByIdResponse } from "@/generated/alert";

export type CreateAlertPayload = zod.infer<typeof createAlertBody>;
export type AlertSeverity = NonNullable<zod.infer<typeof getAlertByIdResponse>["severity"]>;
export type AlertStatus = NonNullable<zod.infer<typeof getAlertByIdResponse>["status"]>;

export type AlertGenerated = NonNullable<zod.infer<typeof getAlertByIdResponse>>;
export type AlertItemGenerated = NonNullable<
    NonNullable<zod.infer<typeof getAlertsResponse>>["content"]
>[number];

export type ConflictAlert = AlertItemGenerated & {
    id: string;
};

export type AlertListResponse = NonNullable<zod.infer<typeof getAlertsResponse>>;

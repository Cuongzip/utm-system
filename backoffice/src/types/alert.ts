import type zod from "zod";
import type {
    createAlertBody,
    getAlertsResponse,
    getAlertByIdResponse,
    getAlertsQueryParams,
    acknowledgeAlertBody,
    resolveAlertBody,
} from "@/generated/alert";

export type CreateAlertPayload = zod.infer<typeof createAlertBody>;
export type AlertSeverity = NonNullable<zod.infer<typeof getAlertByIdResponse>["severity"]>;
export type AlertStatus = NonNullable<zod.infer<typeof getAlertByIdResponse>["status"]>;

export type AlertGenerated = NonNullable<zod.infer<typeof getAlertByIdResponse>>;
export type AlertItemGenerated = NonNullable<
    NonNullable<zod.infer<typeof getAlertsResponse>>["content"]
>[number];

export type AlertVm = AlertItemGenerated & {
    id: string;
};

export type ConflictAlert = AlertVm;

export type AlertListResponse = NonNullable<zod.infer<typeof getAlertsResponse>>;

export type AlertQueryParams = zod.infer<typeof getAlertsQueryParams>;
export type AcknowledgeAlertPayload = zod.infer<typeof acknowledgeAlertBody>;
export type ResolveAlertPayload = zod.infer<typeof resolveAlertBody>;

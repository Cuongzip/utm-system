import type zod from "zod";
import type { getAlertsResponse, acknowledgeAlertBody } from "@/generated/alert";

export type AlertItemGenerated = NonNullable<
    NonNullable<zod.infer<typeof getAlertsResponse>>["content"]
>[number];

export type AlertVm = AlertItemGenerated & {
    id: string;
};

export type ConflictAlert = AlertVm;

export type AcknowledgeAlertPayload = zod.infer<typeof acknowledgeAlertBody>;

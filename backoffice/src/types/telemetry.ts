import type zod from "zod";
import type {
    ingestTelemetryBody,
    getLatestFlightTelemetryResponse,
    getFlightTelemetryHistoryResponseItem,
} from "@/generated/telemetry";

export type IngestTelemetryPayload = zod.infer<typeof ingestTelemetryBody>;

export type TelemetryRecord = NonNullable<zod.infer<typeof getLatestFlightTelemetryResponse>>;
export type TelemetryHistoryItem = NonNullable<
    zod.infer<typeof getFlightTelemetryHistoryResponseItem>
>;

export type TelemetryPoint = TelemetryRecord;

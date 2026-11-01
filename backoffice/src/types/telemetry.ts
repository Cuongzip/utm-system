import type zod from "zod";
import type { getLatestFlightTelemetryResponse } from "@/generated/telemetry";

export type TelemetryRecord = NonNullable<zod.infer<typeof getLatestFlightTelemetryResponse>>;

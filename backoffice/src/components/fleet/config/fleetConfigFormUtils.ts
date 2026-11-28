import type { CreateFleetConfigPayload, FleetConfig } from "@/types";

export const WEIGHT_KEYS = [
    "proximity",
    "battery",
    "capability",
    "utilization",
    "maintenance",
] as const;

type WeightKey = (typeof WEIGHT_KEYS)[number];

export interface WeightFieldOption {
    key: WeightKey;
    label: string;
}

export interface ConfigFormState {
    name: string;
    description: string;
    weights: Record<WeightKey, string>;
    minDronesPerHub: string;
    minDonorReserve: string;
    minBatteryForReposition: string;
    maxConcurrentRepositions: string;
    rebalanceCooldownMinutes: string;
    quietHoursOnly: boolean;
}

export const DEFAULT_FORM: ConfigFormState = {
    name: "",
    description: "",
    weights: {
        proximity: "30",
        battery: "25",
        capability: "20",
        utilization: "15",
        maintenance: "10",
    },
    minDronesPerHub: "2",
    minDonorReserve: "2",
    minBatteryForReposition: "60",
    maxConcurrentRepositions: "2",
    rebalanceCooldownMinutes: "30",
    quietHoursOnly: false,
};

export function parseNum(raw: string, fallback: number): number {
    if (raw.trim() === "") return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function toPct(value?: number): number {
    if (value === undefined) return 0;
    return value <= 1 ? Math.round(value * 100) : Math.round(value);
}

export function fromConfigToForm(cfg?: FleetConfig | null): ConfigFormState {
    if (!cfg) return DEFAULT_FORM;
    return {
        name: cfg.name ?? "",
        description: cfg.description ?? "",
        weights: {
            proximity: String(toPct(cfg.weights?.proximity ?? 0.3)),
            battery: String(toPct(cfg.weights?.battery ?? 0.25)),
            capability: String(toPct(cfg.weights?.capability ?? 0.2)),
            utilization: String(toPct(cfg.weights?.utilization ?? 0.15)),
            maintenance: String(toPct(cfg.weights?.maintenance ?? 0.1)),
        },
        minDronesPerHub: String(cfg.thresholds?.minDronesPerHub ?? 2),
        minDonorReserve: String(cfg.thresholds?.minDonorReserve ?? 2),
        minBatteryForReposition: String(cfg.thresholds?.minBatteryForReposition ?? 60),
        maxConcurrentRepositions: String(cfg.thresholds?.maxConcurrentRepositions ?? 2),
        rebalanceCooldownMinutes: String(cfg.thresholds?.rebalanceCooldownMinutes ?? 30),
        quietHoursOnly: cfg.thresholds?.quietHoursOnly ?? false,
    };
}

export function toCreateFleetConfigPayload(form: ConfigFormState): CreateFleetConfigPayload {
    return {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        weights: {
            proximity: parseNum(form.weights.proximity, 0) / 100,
            battery: parseNum(form.weights.battery, 0) / 100,
            capability: parseNum(form.weights.capability, 0) / 100,
            utilization: parseNum(form.weights.utilization, 0) / 100,
            maintenance: parseNum(form.weights.maintenance, 0) / 100,
        },
        thresholds: {
            minDronesPerHub: Math.max(0, parseNum(form.minDronesPerHub, 2)),
            minDonorReserve: Math.max(0, parseNum(form.minDonorReserve, 2)),
            minBatteryForReposition: Math.min(
                100,
                Math.max(10, parseNum(form.minBatteryForReposition, 60))
            ),
            maxConcurrentRepositions: Math.max(1, parseNum(form.maxConcurrentRepositions, 2)),
            rebalanceCooldownMinutes: Math.max(1, parseNum(form.rebalanceCooldownMinutes, 30)),
            quietHoursOnly: form.quietHoursOnly,
        },
    };
}

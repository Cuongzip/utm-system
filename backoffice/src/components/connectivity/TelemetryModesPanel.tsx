"use client";

import { Radio, Gauge, Zap, AlertTriangle, type LucideIcon } from "lucide-react";
import { ChamferCard } from "@/components/ui";

export interface TelemetryModesPanelProps {
    counts?: Record<string, number>;
}

interface TelemetryModeDefinition {
    id: string;
    name: string;
    rate: string;
    bandwidth: string;
    icon: LucideIcon;
    color: string;
    description: string;
}

const TELEMETRY_MODES: readonly TelemetryModeDefinition[] = [
    {
        id: "idle",
        name: "Idle Telemetry",
        rate: "1 Hz",
        bandwidth: "~1.2 KB/s",
        icon: Radio,
        color: "text-slate-600",
        description:
            "Used when drones are powered on and stationary on the ground. Transmits health checks and battery level at low bandwidth.",
    },
    {
        id: "normal",
        name: "Normal Telemetry",
        rate: "5 Hz",
        bandwidth: "~6.5 KB/s",
        icon: Gauge,
        color: "text-emerald-600",
        description:
            "Standard en-route flight monitoring. Transmits 3D positioning, GPS quality, altitude, attitude, and airspeed parameters.",
    },
    {
        id: "enhanced",
        name: "Enhanced Telemetry",
        rate: "20 Hz",
        bandwidth: "~24 KB/s",
        icon: Zap,
        color: "text-blue-600",
        description:
            "Triggered during BVLOS flights, terminal airspace approach, and high-density corridors for millisecond precision tracking.",
    },
    {
        id: "emergency",
        name: "Emergency Telemetry",
        rate: "50 Hz",
        bandwidth: "~60 KB/s",
        icon: AlertTriangle,
        color: "text-rose-600",
        description:
            "Maximum priority burst mode activated during airspace conflicts, geofence breaches, or loss of primary C2 link failover.",
    },
] as const;

export function TelemetryModesPanel({
    counts = { idle: 0, normal: 0, enhanced: 0, emergency: 0 },
}: TelemetryModesPanelProps) {
    return (
        <ChamferCard size="lg" className="min-h-[420px]">
            <div className="p-5 flex flex-col flex-1 w-full gap-4">
                <div>
                    <h2 className="text-[12px] font-bold uppercase text-[var(--color-text-primary)] tracking-[0.6px] leading-4">
                        ADAPTIVE TELEMETRY MODES
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    {TELEMETRY_MODES.map((mode) => {
                        const Icon = mode.icon;
                        const activeCount = counts[mode.id] ?? 0;
                        return (
                            <div
                                key={mode.id}
                                className="rounded border border-slate-200 bg-white p-4 flex flex-col justify-between gap-3 hover:border-slate-300 hover:shadow-xs transition-all"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Icon className={`w-4 h-4 ${mode.color}`} />
                                        <span className="text-sm font-bold text-slate-900">
                                            {mode.name}
                                        </span>
                                    </div>
                                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-900">
                                        {mode.rate}
                                    </span>
                                </div>

                                <p className="text-xs text-slate-500 leading-relaxed">
                                    {mode.description}
                                </p>

                                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-100">
                                    <span>
                                        Bandwidth:{" "}
                                        <span className="font-bold text-slate-800">
                                            {mode.bandwidth}
                                        </span>
                                    </span>
                                    <span>
                                        Active Devices:{" "}
                                        <span className="font-bold text-slate-800">
                                            {activeCount}
                                        </span>
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </ChamferCard>
    );
}

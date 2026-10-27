"use client";

import { Radio, Gauge, Zap, AlertTriangle } from "lucide-react";
import { ChamferCard } from "@/components/ui";
import styles from "./TelemetryModesPanel.module.css";

interface TelemetryModesPanelProps {
    counts?: Record<string, number>;
}

export function TelemetryModesPanel({
    counts = { idle: 0, normal: 0, enhanced: 0, emergency: 0 },
}: TelemetryModesPanelProps) {
    const modes = [
        {
            id: "idle",
            name: "Idle Telemetry",
            rate: "1 Hz",
            bandwidth: "~1.2 KB/s",
            icon: Radio,
            color: "text-slate-600",
            description:
                "Used when drones are powered on and stationary on the ground. Transmits health checks and battery level at low bandwidth.",
            activeCount: counts.idle || 0,
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
            activeCount: counts.normal || 0,
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
            activeCount: counts.enhanced || 0,
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
            activeCount: counts.emergency || 0,
        },
    ];

    return (
        <ChamferCard size="lg" className="min-h-[420px]">
            <div className="p-5 flex flex-col h-full w-full gap-4">
                <div>
                    <h2 className="text-[12px] font-bold uppercase text-[#1e293b] tracking-[0.6px] leading-4">
                        ADAPTIVE TELEMETRY MODES
                    </h2>
                </div>

                <div className={styles.grid}>
                    {modes.map((mode) => {
                        const Icon = mode.icon;
                        return (
                            <div key={mode.id} className={styles.modeCard}>
                                <div className={styles.header}>
                                    <div className="flex items-center gap-2">
                                        <Icon className={`w-4 h-4 ${mode.color}`} />
                                        <span className={styles.title}>{mode.name}</span>
                                    </div>
                                    <span className={styles.rateBadge}>{mode.rate}</span>
                                </div>

                                <p className={styles.desc}>{mode.description}</p>

                                <div className={styles.footer}>
                                    <span>
                                        Bandwidth:{" "}
                                        <span className={styles.statValue}>{mode.bandwidth}</span>
                                    </span>
                                    <span>
                                        Active Devices:{" "}
                                        <span className={styles.statValue}>{mode.activeCount}</span>
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

export default TelemetryModesPanel;

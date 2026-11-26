"use client";

import { BatteryCharging, Gauge, Compass, Navigation } from "lucide-react";
import { KpiStrip } from "@/components/ui";
import { formatAltitude, formatDistance, formatSpeed } from "@/utils";
import { SIMULATION_SCENARIO, type SimulationSession } from "@/types";

export interface SessionTelemetryCardsProps {
    session: SimulationSession;
}

export function SessionTelemetryCards({ session }: SessionTelemetryCardsProps) {
    const isC2Lost =
        String(session.activeScenario || "").toLowerCase() === SIMULATION_SCENARIO.C2_LOST;
    const battery = session.currentBattery ?? 100;
    const speed = session.speed ?? 0;
    const alt = session.currentAlt ?? 0;
    const heading = session.currentHeading ?? 0;
    const progress = Math.min(100, Math.max(0, session.progress ?? 0));

    const batteryColor = isC2Lost
        ? "text-amber-500"
        : battery > 50
          ? "text-emerald-600"
          : battery > 20
            ? "text-amber-500"
            : "text-red-600";

    const batterySubValue = isC2Lost
        ? "LINK LOST"
        : battery > 50
          ? "NOMINAL"
          : battery > 20
            ? "MODERATE"
            : "CRITICAL";

    const speedSubValue = isC2Lost ? "C2 HOVER FAILSAFE" : formatSpeed(speed);

    return (
        <KpiStrip
            items={[
                {
                    id: "battery",
                    label: "BATTERY",
                    value: `${battery.toFixed(1)}%`,
                    subValue: batterySubValue,
                    icon: BatteryCharging,
                    iconClassName: batteryColor,
                },
                {
                    id: "speed",
                    label: "GROUND SPEED",
                    value: `${speed.toFixed(1)} m/s`,
                    subValue: speedSubValue,
                    icon: Gauge,
                },
                {
                    id: "altitude",
                    label: "ALTITUDE & HEADING",
                    value: formatAltitude(alt),
                    subValue: `HDG ${heading.toFixed(0)}°`,
                    icon: Compass,
                },
                {
                    id: "trajectory",
                    label: "TRAJECTORY",
                    value: `${progress.toFixed(1)}%`,
                    subValue: `${formatDistance(session.traveledDistance ?? 0)} / ${formatDistance(session.totalDistance ?? 0)}`,
                    icon: Navigation,
                },
            ]}
            footerBar={
                <div className="h-1.5 w-full bg-slate-200 overflow-hidden">
                    <div
                        className="h-full bg-slate-800 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            }
        />
    );
}

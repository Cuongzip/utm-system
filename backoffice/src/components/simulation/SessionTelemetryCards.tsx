"use client";

import { BatteryCharging, Gauge, Compass, Navigation } from "lucide-react";
import { MetricCard } from "@/components/ui";
import { formatAltitude, formatDistance, formatSpeed } from "@/utils";
import type { SimulationSession } from "@/types";

export interface SessionTelemetryCardsProps {
    session: SimulationSession;
}

export function SessionTelemetryCards({ session }: SessionTelemetryCardsProps) {
    const battery = session.currentBattery ?? 100;
    const speed = session.speed ?? 0;
    const alt = session.currentAlt ?? 0;
    const heading = session.currentHeading ?? 0;
    const progress = Math.min(100, Math.max(0, session.progress ?? 0));

    const batteryColor =
        battery > 50 ? "text-emerald-500" : battery > 20 ? "text-amber-500" : "text-red-500";

    const batterySubValue = battery > 50 ? "NOMINAL" : battery > 20 ? "MODERATE" : "CRITICAL";

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            <MetricCard
                title="BATTERY"
                value={`${battery.toFixed(1)}%`}
                subValue={batterySubValue}
                icon={BatteryCharging}
                iconClassName={batteryColor}
            >
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                    <div
                        className={
                            battery > 50
                                ? "h-full bg-emerald-500 transition-all duration-300"
                                : battery > 20
                                  ? "h-full bg-amber-500 transition-all duration-300"
                                  : "h-full bg-red-500 transition-all duration-300"
                        }
                        style={{ width: `${Math.min(100, Math.max(0, battery))}%` }}
                    />
                </div>
            </MetricCard>

            <MetricCard
                title="SPEED"
                value={`${speed.toFixed(1)} m/s`}
                subValue={formatSpeed(speed)}
                icon={Gauge}
            />

            <MetricCard
                title="ALTITUDE & HEADING"
                value={formatAltitude(alt)}
                subValue={`HDG ${heading.toFixed(0)}°`}
                icon={Compass}
            />

            <MetricCard
                title="TRAJECTORY"
                value={`${progress.toFixed(1)}%`}
                subValue={`${formatDistance(session.traveledDistance ?? 0)} / ${formatDistance(session.totalDistance ?? 0)}`}
                icon={Navigation}
            >
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                    <div
                        className="h-full bg-slate-600 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </MetricCard>
        </div>
    );
}

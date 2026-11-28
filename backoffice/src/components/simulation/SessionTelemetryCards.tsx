"use client";

import { useTranslations } from "next-intl";
import { BatteryCharging, Gauge, Compass, Navigation } from "lucide-react";
import { KpiStrip } from "@/components/ui";
import { formatAltitude, formatDistance, formatSpeed } from "@/utils";
import { SIMULATION_SCENARIO, type SimulationSession } from "@/types";

interface SessionTelemetryCardsProps {
    session: SimulationSession;
}

export function SessionTelemetryCards({ session }: SessionTelemetryCardsProps) {
    const t = useTranslations("simulation.telemetryCards");
    const isC2Lost =
        String(session.activeScenario || "").toLowerCase() === SIMULATION_SCENARIO.C2_LOST;
    const battery = session.currentBattery ?? 100;
    const speed = session.speed ?? 0;
    const alt = session.currentAlt ?? 0;
    const heading = session.currentHeading ?? 0;
    const progress = Math.min(100, Math.max(0, session.progress ?? 0));

    const batterySubValue = isC2Lost
        ? t("linkLost")
        : battery > 50
          ? t("nominal")
          : battery > 20
            ? t("moderate")
            : t("critical");

    const speedSubValue = isC2Lost ? t("c2HoverFailsafe") : formatSpeed(speed);

    return (
        <KpiStrip
            items={[
                {
                    id: "battery",
                    label: t("battery"),
                    value: `${battery.toFixed(1)}%`,
                    subValue: batterySubValue,
                    icon: BatteryCharging,
                },
                {
                    id: "speed",
                    label: t("groundSpeed"),
                    value: `${speed.toFixed(1)} m/s`,
                    subValue: speedSubValue,
                    icon: Gauge,
                },
                {
                    id: "altitude",
                    label: t("altitudeHeading"),
                    value: formatAltitude(alt),
                    subValue: t("hdgSub", { deg: heading.toFixed(0) }),
                    icon: Compass,
                },
                {
                    id: "trajectory",
                    label: t("trajectory"),
                    value: `${progress.toFixed(1)}%`,
                    subValue: `${formatDistance(session.traveledDistance ?? 0)} / ${formatDistance(session.totalDistance ?? 0)}`,
                    icon: Navigation,
                },
            ]}
            footerBar={
                <div className="h-1.5 w-full bg-slate-200 overflow-hidden">
                    <div
                        className="h-full bg-slate-800 transition-[width] duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            }
        />
    );
}

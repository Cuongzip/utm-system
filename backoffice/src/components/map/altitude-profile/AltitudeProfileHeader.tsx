"use client";

import { useTranslations } from "next-intl";
import { formatAltitude, formatDistance } from "@/utils";
import { cn } from "@/lib";
import type { LiveAltitudeProgress } from "./computeProfileGeometry";

interface AltitudeProfileHeaderProps {
    isDark: boolean;
    hideHeader: boolean;
    penetratedCount: number;
    crossingCount: number;
    liveProgress: LiveAltitudeProgress | null;
    activeTraceColor: string;
    totalDistance: number;
    maxAlt: number;
}

export function AltitudeProfileHeader({
    isDark,
    hideHeader,
    penetratedCount,
    crossingCount,
    liveProgress,
    activeTraceColor,
    totalDistance,
    maxAlt,
}: AltitudeProfileHeaderProps) {
    const t = useTranslations("map");

    return (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono mb-1">
            <div className="flex items-center gap-2">
                {!hideHeader && (
                    <span
                        className={cn(
                            "text-[11px] font-bold tracking-wider",
                            isDark ? "text-slate-100" : "text-[var(--color-text-primary)]"
                        )}
                    >
                        {t("altitudeProfile")}
                    </span>
                )}
                {penetratedCount > 0 ? (
                    <span
                        className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                            isDark
                                ? "bg-red-950/80 border-red-500/50 text-red-300"
                                : "bg-red-500/15 border-red-500/35 text-red-600"
                        )}
                    >
                        {t("zonePenetration", { count: penetratedCount })}
                    </span>
                ) : crossingCount > 0 ? (
                    <span
                        className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-semibold border",
                            isDark
                                ? "bg-sky-950/80 border-sky-500/40 text-sky-300"
                                : "bg-cyan-500/10 border-cyan-500/30 text-cyan-700"
                        )}
                    >
                        {t("airspaceSector", { count: crossingCount })}
                    </span>
                ) : null}
            </div>
            <div className="flex items-center gap-3 text-[10px] ml-auto">
                {liveProgress && (
                    <span
                        className={cn(
                            "inline-flex items-center gap-1.5 font-semibold tabular-nums",
                            liveProgress.isReplay
                                ? isDark
                                    ? "text-amber-300"
                                    : "text-amber-700"
                                : isDark
                                  ? "text-emerald-300"
                                  : "text-emerald-700"
                        )}
                    >
                        <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: activeTraceColor }}
                        />
                        <span>UAV {formatAltitude(Math.round(liveProgress.altitudeM))}</span>
                    </span>
                )}
                <span className={isDark ? "text-slate-400" : undefined}>
                    {t("distance")}{" "}
                    <strong
                        className={isDark ? "text-slate-100" : "text-[var(--color-text-primary)]"}
                    >
                        {formatDistance(totalDistance)}
                    </strong>
                </span>
                <span className={isDark ? "text-slate-400" : undefined}>
                    {t("ceiling")}{" "}
                    <strong
                        className={isDark ? "text-slate-100" : "text-[var(--color-text-primary)]"}
                    >
                        {formatAltitude(maxAlt)}
                    </strong>
                </span>
            </div>
        </div>
    );
}

"use client";

import { memo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, Navigation } from "lucide-react";
import { StatusBadge } from "@/components/ui";
import { formatDistance } from "@/utils";
import type { LegEtaProgress } from "../routeProgressUtils";
import type { Drone, Flight, FlightConformance, Hub, TelemetryRecord } from "@/types";
import { formatElapsedClock, useCockpitHudMetrics } from "./useCockpitHudMetrics";
import { CockpitPrimaryInstrumentsGrid } from "./CockpitPrimaryInstrumentsGrid";
import { CockpitPowerLinkSection } from "./CockpitPowerLinkSection";

interface CockpitTelemetryHudProps {
    flight: Flight;
    drone: Drone | null;
    departureHub: Hub | null;
    arrivalHub: Hub | null;
    telemetry: TelemetryRecord | null;
    conformance?: FlightConformance | null;
    legProgress: LegEtaProgress | null;
}

export const CockpitTelemetryHud = memo(function CockpitTelemetryHud({
    flight,
    drone,
    departureHub,
    arrivalHub,
    telemetry,
    conformance,
    legProgress,
}: CockpitTelemetryHudProps) {
    const t = useTranslations("flights.deck");
    const [collapsed, setCollapsed] = useState(false);

    const {
        elapsedSeconds,
        arrivalGoNoGo,
        linkedDevice,
        setRateMutation,
        altMsl,
        altAgl,
        speedMs,
        speedKmh,
        vertSpeed,
        heading,
        pitch,
        roll,
        batteryPct,
        batteryVoltage,
        batteryTemp,
        powerDrawW,
        remainingMinutes,
        phaseLabel,
        activeTelemetryMode,
        conformanceStatus,
        xteM,
        corridorM,
        vertErrM,
        vertBufM,
        depCode,
        arrCode,
    } = useCockpitHudMetrics({
        flight,
        drone,
        departureHub,
        arrivalHub,
        telemetry,
        conformance,
    });

    return (
        <aside
            aria-label={t("hudInstrumentsTitle")}
            className="absolute top-24 sm:top-3.5 left-3.5 z-30 w-[calc(100vw-1.75rem)] sm:w-72 max-h-[calc(100%-11rem)] sm:max-h-[calc(100%-6.5rem)] flex flex-col rounded-md border border-slate-700/85 bg-slate-900/92 text-slate-100 shadow-2xl backdrop-blur-md overflow-hidden pointer-events-auto"
        >
            <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-slate-700/80 shrink-0">
                <div className="min-w-0 flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-200 whitespace-nowrap">
                        {t("hudInstrumentsTitle")}
                    </span>
                    {collapsed && (
                        <span className="font-mono text-[11px] text-emerald-400 tabular-nums truncate">
                            {altMsl != null ? `${Math.round(altMsl)}m` : "—"} ·{" "}
                            {speedKmh != null ? `${speedKmh}km/h` : "—"} ·{" "}
                            {batteryPct != null ? `${Math.round(batteryPct)}%` : "—"}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    {!collapsed && elapsedSeconds != null && (
                        <span className="font-mono text-[10px] font-bold text-emerald-400 tabular-nums">
                            T+{formatElapsedClock(elapsedSeconds)}
                        </span>
                    )}
                    <button
                        type="button"
                        aria-expanded={!collapsed}
                        aria-label={collapsed ? t("expandHud") : t("collapseHud")}
                        onClick={() => setCollapsed((prev) => !prev)}
                        className="w-6 h-6 rounded hover:bg-slate-800 inline-flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    >
                        {collapsed ? (
                            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                            <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                    </button>
                </div>
            </div>

            {!collapsed && (
                <div className="divide-y divide-slate-700/80 text-xs overflow-y-auto utm-scroll min-h-0">
                    <div className="px-3 py-1.5 bg-slate-800/60 flex items-center justify-between gap-2 font-mono text-[10px]">
                        <span className="font-bold uppercase tracking-wider text-emerald-400 truncate">
                            {phaseLabel}
                        </span>
                        {depCode && arrCode && (
                            <span className="text-slate-300 truncate">
                                {depCode} → {arrCode}
                            </span>
                        )}
                    </div>

                    <CockpitPrimaryInstrumentsGrid
                        altMsl={altMsl}
                        altAgl={altAgl}
                        cruisingAltitudeM={flight.cruisingAltitudeM}
                        speedKmh={speedKmh}
                        speedMs={speedMs}
                        vertSpeed={vertSpeed}
                        flightMode={telemetry?.flightMode}
                        heading={heading}
                        pitch={pitch}
                        roll={roll}
                    />

                    {legProgress && (
                        <div className="px-3 py-2 space-y-1.5 font-mono text-[10px]">
                            <div className="flex items-center justify-between gap-2 text-slate-300">
                                <span className="inline-flex items-center gap-1 truncate">
                                    <Navigation
                                        className="w-3 h-3 text-slate-400 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span className="truncate">
                                        {t("nextPoint")}: {legProgress.nextLabel} (
                                        {formatDistance(legProgress.distToNextM)})
                                    </span>
                                </span>
                                <span className="text-slate-400 tabular-nums shrink-0">
                                    {legProgress.etaMinutes != null
                                        ? `ETA ~${legProgress.etaMinutes}m`
                                        : `${legProgress.progressPct}%`}
                                </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 transition-[width] duration-500"
                                    style={{ width: `${legProgress.progressPct}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="lg:hidden px-3 py-2 flex items-center justify-between gap-2 font-mono text-[11px]">
                        <StatusBadge status={conformanceStatus} tone="dark" />
                        <span className="text-slate-300 tabular-nums">
                            XTE {xteM.toFixed(1)}/{Math.round(corridorM)}m · ΔAlt{" "}
                            {vertErrM.toFixed(1)}/{Math.round(vertBufM)}m
                        </span>
                    </div>

                    <CockpitPowerLinkSection
                        batteryPct={batteryPct}
                        batteryVoltage={batteryVoltage}
                        batteryTemp={batteryTemp}
                        powerDrawW={powerDrawW}
                        remainingMinutes={remainingMinutes}
                        telemetry={telemetry}
                        linkedDeviceIdentifier={linkedDevice?.deviceIdentifier}
                        hasLinkedDevice={Boolean(linkedDevice?.id)}
                        activeTelemetryMode={activeTelemetryMode}
                        isSettingRate={setRateMutation.isPending}
                        onSelectRate={(mode) => setRateMutation.mutate(mode)}
                        arrivalHub={arrivalHub}
                        arrivalGoNoGo={arrivalGoNoGo}
                    />
                </div>
            )}
        </aside>
    );
});

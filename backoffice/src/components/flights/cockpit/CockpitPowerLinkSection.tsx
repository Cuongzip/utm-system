"use client";

import { useLocale, useTranslations } from "next-intl";
import { CloudSun } from "lucide-react";
import { StatusBadge } from "@/components/ui";
import type { AppLocale } from "@/i18n";
import { cn } from "@/lib";
import { formatCoordinates, localizeServerText } from "@/utils";
import {
    TELEMETRY_MODES,
    type Hub,
    type HubGoNoGo,
    type TelemetryMode,
    type TelemetryRecord,
} from "@/types";
import { MODE_HZ_LABELS } from "./useCockpitHudMetrics";

interface CockpitPowerLinkSectionProps {
    batteryPct: number | null;
    batteryVoltage: number | null;
    batteryTemp: number | null;
    powerDrawW: number | null;
    remainingMinutes: number | null;
    telemetry: TelemetryRecord | null;
    linkedDeviceIdentifier: string | null | undefined;
    hasLinkedDevice: boolean;
    activeTelemetryMode: TelemetryMode;
    isSettingRate: boolean;
    onSelectRate: (mode: TelemetryMode) => void;
    arrivalHub: Hub | null;
    arrivalGoNoGo: HubGoNoGo | null | undefined;
}

export function CockpitPowerLinkSection({
    batteryPct,
    batteryVoltage,
    batteryTemp,
    powerDrawW,
    remainingMinutes,
    telemetry,
    linkedDeviceIdentifier,
    hasLinkedDevice,
    activeTelemetryMode,
    isSettingRate,
    onSelectRate,
    arrivalHub,
    arrivalGoNoGo,
}: CockpitPowerLinkSectionProps) {
    const t = useTranslations("flights.deck");
    const locale = useLocale() as AppLocale;

    return (
        <>
            <div className="p-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                    <span className="font-bold uppercase text-slate-300">
                        {t("powerPropulsion")}
                    </span>
                    {remainingMinutes != null && (
                        <span className="text-slate-400 tabular-nums">
                            ~{remainingMinutes} {t("minRemaining")}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-4 divide-x divide-slate-700/80 text-center bg-slate-800/70 rounded py-1.5 border border-slate-700/80 font-mono">
                    <div className="px-1">
                        <div className="text-[9px] text-slate-400 uppercase">{t("soc")}</div>
                        <div
                            className={cn(
                                "text-xs font-bold tabular-nums mt-0.5",
                                batteryPct != null && batteryPct < 20
                                    ? "text-red-400"
                                    : batteryPct != null && batteryPct <= 35
                                      ? "text-amber-400"
                                      : "text-white"
                            )}
                        >
                            {batteryPct != null ? `${Math.round(batteryPct)}%` : "—"}
                        </div>
                    </div>
                    <div className="px-1">
                        <div className="text-[9px] text-slate-400 uppercase">{t("voltage")}</div>
                        <div className="text-xs font-bold text-white tabular-nums mt-0.5">
                            {batteryVoltage != null ? `${batteryVoltage.toFixed(1)}V` : "—"}
                        </div>
                    </div>
                    <div className="px-1">
                        <div className="text-[9px] text-slate-400 uppercase">{t("temp")}</div>
                        <div className="text-xs font-bold text-white tabular-nums mt-0.5">
                            {batteryTemp != null ? `${batteryTemp.toFixed(0)}°C` : "—"}
                        </div>
                    </div>
                    <div className="px-1">
                        <div className="text-[9px] text-slate-400 uppercase">{t("load")}</div>
                        <div className="text-xs font-bold text-white tabular-nums mt-0.5">
                            {powerDrawW != null ? `${Math.round(powerDrawW)}W` : "—"}
                        </div>
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>{t("telemetryRate")}</span>
                        <span className="truncate max-w-[135px] tabular-nums">
                            {telemetry?.latitude != null && telemetry?.longitude != null
                                ? formatCoordinates({
                                      latitude: telemetry.latitude,
                                      longitude: telemetry.longitude,
                                  })
                                : (linkedDeviceIdentifier ?? t("simulatedLink"))}
                        </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                        {TELEMETRY_MODES.map((m) => {
                            const selected = activeTelemetryMode === m;
                            const disabled = !hasLinkedDevice || isSettingRate;
                            return (
                                <button
                                    key={m}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => onSelectRate(m)}
                                    title={!hasLinkedDevice ? t("noDeviceLinked") : m}
                                    className={cn(
                                        "h-6 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                                        selected
                                            ? "bg-slate-200 text-slate-900"
                                            : "border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
                                    )}
                                >
                                    {MODE_HZ_LABELS[m]}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {arrivalHub && (
                <div className="px-2.5 py-2 flex items-center justify-between gap-2 font-mono text-[11px]">
                    <span className="inline-flex items-center gap-1.5 text-slate-300 truncate">
                        <CloudSun
                            className="w-3.5 h-3.5 text-slate-400 shrink-0"
                            aria-hidden="true"
                        />
                        <span className="truncate">
                            {arrivalHub.code || arrivalHub.name}
                            {arrivalGoNoGo?.windSpeedMs != null
                                ? ` · ${arrivalGoNoGo.windSpeedMs.toFixed(1)}m/s`
                                : ""}
                        </span>
                    </span>
                    {arrivalGoNoGo?.verdict ? (
                        <span
                            title={
                                arrivalGoNoGo.reasons?.[0]
                                    ? localizeServerText(arrivalGoNoGo.reasons[0], locale)
                                    : undefined
                            }
                        >
                            <StatusBadge status={arrivalGoNoGo.verdict.toLowerCase()} tone="dark" />
                        </span>
                    ) : (
                        <span className="text-[10px] text-slate-500">METAR —</span>
                    )}
                </div>
            )}
        </>
    );
}

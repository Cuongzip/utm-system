"use client";

import { useState } from "react";
import { AlertTriangle, Cloud } from "lucide-react";
import { ChamferCard, StatusBadge, EmptyState, Skeleton, TacticalCallout } from "@/components/ui";
import { useWeatherMetar, useWeatherTaf, useWeatherSigmet } from "@/hooks";
import { formatDateTime } from "@/utils";

type ReportTab = "metar" | "taf" | "sigmet";

export function AviationReportsCard() {
    const [tab, setTab] = useState<ReportTab>("metar");
    const { data: metars = [], isLoading: metarLoading } = useWeatherMetar();
    const { data: tafs = [], isLoading: tafLoading } = useWeatherTaf(true);
    const { data: sigmets = [], isLoading: sigmetLoading } = useWeatherSigmet();

    const reportTabs: { id: ReportTab; label: string; count?: number }[] = [
        { id: "metar", label: "METAR", count: metarLoading ? undefined : metars.length },
        { id: "taf", label: "TAF", count: tafLoading ? undefined : tafs.length },
        { id: "sigmet", label: "SIGMET", count: sigmetLoading ? undefined : sigmets.length },
    ];

    return (
        <ChamferCard size="md">
            <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                    Aviation Bulletins · NOAA AWC
                </span>
                <div
                    role="tablist"
                    aria-label="Aviation report categories"
                    className="flex items-center gap-1 rounded-md bg-slate-100 p-0.5 border border-slate-200"
                >
                    {reportTabs.map((item) => {
                        const selected = tab === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                role="tab"
                                aria-selected={selected}
                                onClick={() => setTab(item.id)}
                                className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                                    selected
                                        ? "bg-slate-900 text-white"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                {item.label}
                                {item.count !== undefined ? ` (${item.count})` : ""}
                            </button>
                        );
                    })}
                </div>
            </div>

            {tab === "metar" && (
                <>
                    {metarLoading ? (
                        <div className="divide-y divide-slate-200">
                            {Array.from({ length: 3 }).map((_, idx) => (
                                <div key={idx} className="p-4 flex flex-col gap-2.5">
                                    <div className="flex items-center justify-between">
                                        <Skeleton className="h-4 w-44" />
                                        <Skeleton className="h-5 w-14" />
                                    </div>
                                    <Skeleton className="h-8 w-full" />
                                </div>
                            ))}
                        </div>
                    ) : metars.length === 0 ? (
                        <EmptyState
                            icon={Cloud}
                            title="No METAR Observations"
                            description="No aerodrome METAR bulletins returned by NOAA AWC."
                        />
                    ) : (
                        <div className="divide-y divide-slate-200">
                            {metars.map((m, idx) => (
                                <div key={m.icaoId ?? idx} className="p-4 flex flex-col gap-2.5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm font-bold text-slate-900">
                                                {m.icaoId}
                                            </span>
                                            {m.stationName && (
                                                <span className="text-xs text-slate-500">
                                                    {m.stationName}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-600 tabular-nums">
                                                <span>
                                                    TEMP{" "}
                                                    <strong className="text-slate-900">
                                                        {m.temperatureC ?? "—"}°/
                                                        {m.dewpointC ?? "—"}°
                                                    </strong>
                                                </span>
                                                <span>
                                                    WIND{" "}
                                                    <strong className="text-slate-900">
                                                        {m.windSpeedKt != null
                                                            ? `${m.windDirectionDeg ?? "VRB"}° @ ${m.windSpeedKt}kt`
                                                            : "—"}
                                                    </strong>
                                                </span>
                                                <span>
                                                    VIS{" "}
                                                    <strong className="text-slate-900">
                                                        {m.visibilityM != null
                                                            ? `${(m.visibilityM / 1000).toFixed(1)}km`
                                                            : "—"}
                                                    </strong>
                                                </span>
                                                <span>
                                                    QNH{" "}
                                                    <strong className="text-slate-900">
                                                        {m.altimeterHpa != null
                                                            ? `${Math.round(m.altimeterHpa)} hPa`
                                                            : "—"}
                                                    </strong>
                                                </span>
                                            </div>
                                            <StatusBadge status={m.flightCategory ?? "unknown"} />
                                        </div>
                                    </div>

                                    {m.rawOb && (
                                        <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-mono text-slate-700 whitespace-pre-wrap break-all">
                                            {m.rawOb}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {tab === "taf" && (
                <>
                    {tafLoading ? (
                        <div className="divide-y divide-slate-200">
                            {Array.from({ length: 2 }).map((_, idx) => (
                                <div key={idx} className="p-4 flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3.5 w-40" />
                                    </div>
                                    <Skeleton className="h-12 w-full" />
                                </div>
                            ))}
                        </div>
                    ) : tafs.length === 0 ? (
                        <EmptyState
                            icon={Cloud}
                            title="No TAF Forecasts"
                            description="No Terminal Aerodrome Forecasts available at this time."
                        />
                    ) : (
                        <div className="divide-y divide-slate-200">
                            {tafs.map((t, idx) => (
                                <div key={t.icaoId ?? idx} className="p-4 flex flex-col gap-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <span className="font-mono text-sm font-bold text-slate-900">
                                                {t.icaoId}
                                            </span>
                                            {t.stationName && (
                                                <span className="text-xs text-slate-500 ml-2">
                                                    {t.stationName}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[11px] font-mono text-slate-500">
                                            {t.validTimeFrom
                                                ? `Valid ${formatDateTime(t.validTimeFrom)}`
                                                : ""}
                                            {t.validTimeTo
                                                ? ` → ${formatDateTime(t.validTimeTo)}`
                                                : ""}
                                        </span>
                                    </div>
                                    <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-mono text-slate-700 whitespace-pre-wrap break-words">
                                        {t.rawTaf || "—"}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {tab === "sigmet" && (
                <div className="p-4">
                    {sigmetLoading ? (
                        <div className="flex flex-col gap-3">
                            {Array.from({ length: 2 }).map((_, idx) => (
                                <Skeleton key={idx} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : sigmets.length === 0 ? (
                        <EmptyState
                            icon={AlertTriangle}
                            title="No Active SIGMET Advisories"
                            description="No severe hazardous weather SIGMETs are currently active in monitored FIRs."
                        />
                    ) : (
                        <div className="flex flex-col gap-3">
                            {sigmets.map((s, idx) => (
                                <TacticalCallout
                                    key={s.id ?? idx}
                                    tone={
                                        (s.severity || "").toLowerCase() === "critical"
                                            ? "critical"
                                            : "warning"
                                    }
                                    icon={AlertTriangle}
                                    title={`${s.firId || "FIR"} — ${s.hazard || "SIGMET"}${
                                        s.qualifier ? ` (${s.qualifier})` : ""
                                    }`}
                                    rightSlot={<StatusBadge status={s.severity ?? "warning"} />}
                                >
                                    {s.rawSigmet && (
                                        <div className="rounded border border-slate-200 bg-white px-3 py-2 text-[11px] font-mono text-slate-700 whitespace-pre-wrap break-words">
                                            {s.rawSigmet}
                                        </div>
                                    )}
                                </TacticalCallout>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </ChamferCard>
    );
}

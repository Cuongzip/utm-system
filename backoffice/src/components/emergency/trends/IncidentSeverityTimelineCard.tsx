"use client";

import { useTranslations } from "next-intl";
import { BarChart3 } from "lucide-react";
import { ChamferCard, EmptyState } from "@/components/ui";
import type { EmergencyTrendVm } from "@/types";
import { formatPeriodLabel, type IntervalKey } from "./useEmergencyTrendsAnalytics";

interface IncidentSeverityTimelineCardProps {
    trends: EmergencyTrendVm[];
    interval: IntervalKey;
    maxTrendTotal: number;
}

export function IncidentSeverityTimelineCard({
    trends,
    interval,
    maxTrendTotal,
}: IncidentSeverityTimelineCardProps) {
    const t = useTranslations("emergency");

    return (
        <ChamferCard size="lg" className="w-full">
            <div className="p-5 flex flex-col gap-4 h-full">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                        {t("trends.overTimeHeading")}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                        {trends.length === 1
                            ? t("trends.periodSingle")
                            : t("trends.periodPlural", { count: trends.length })}
                    </span>
                </div>

                {trends.length === 0 ? (
                    <EmptyState
                        compact
                        icon={BarChart3}
                        title={t("trends.noTimeSeriesTitle")}
                        description={t("trends.noTimeSeriesDesc")}
                    />
                ) : trends.length === 1 ? (
                    <div className="flex flex-col justify-center gap-3 py-4 flex-1">
                        <div className="flex items-baseline justify-between font-mono">
                            <span className="text-xs text-slate-600">
                                {t("trends.periodLabel")}{" "}
                                <strong className="text-slate-900">
                                    {formatPeriodLabel(trends[0].period, interval)}
                                </strong>
                            </span>
                            <span className="text-xl font-bold text-slate-900 tabular-nums">
                                {t("trends.totalLabel", {
                                    total: Number(trends[0].total ?? 0),
                                })}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 divide-x divide-slate-200 border border-slate-200 rounded-md p-3 text-center font-mono text-xs">
                            <div>
                                <div className="text-sm font-bold text-amber-600 tabular-nums">
                                    {Number(trends[0].warnings ?? 0)}
                                </div>
                                <div className="text-[10px] uppercase text-slate-500">
                                    {t("trends.warning")}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm font-bold text-amber-700 tabular-nums">
                                    {Number(trends[0].critical ?? 0)}
                                </div>
                                <div className="text-[10px] uppercase text-slate-500">
                                    {t("trends.critical")}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm font-bold text-red-600 tabular-nums">
                                    {Number(trends[0].emergencies ?? 0)}
                                </div>
                                <div className="text-[10px] uppercase text-slate-500">
                                    {t("trends.emergency")}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 flex-1 justify-end">
                        <div className="flex items-end gap-1.5 h-44 pt-4">
                            {trends.map((bucket, idx) => {
                                const emergencies = Number(bucket.emergencies ?? 0);
                                const critical = Number(bucket.critical ?? 0);
                                const warnings = Number(bucket.warnings ?? 0);
                                const total = Number(bucket.total ?? 0);
                                const emergencyPx = Math.round((emergencies / maxTrendTotal) * 148);
                                const criticalPx = Math.round((critical / maxTrendTotal) * 148);
                                const warningPx = Math.round((warnings / maxTrendTotal) * 148);

                                return (
                                    <div
                                        key={`${bucket.period ?? idx}-${idx}`}
                                        className="flex-1 flex flex-col items-center justify-end min-w-0 group"
                                        title={t("trends.barTooltip", {
                                            period: bucket.period ?? "",
                                            total,
                                            emergencies,
                                            critical,
                                            warnings,
                                        })}
                                    >
                                        {total > 0 && (
                                            <span className="text-[10px] font-mono text-slate-500 mb-1 tabular-nums">
                                                {total}
                                            </span>
                                        )}
                                        <div className="w-full max-w-[32px] flex flex-col justify-end rounded-t overflow-hidden">
                                            {emergencies > 0 && (
                                                <div
                                                    className="w-full bg-red-600 transition-[height]"
                                                    style={{
                                                        height: `${Math.max(emergencyPx, 4)}px`,
                                                    }}
                                                />
                                            )}
                                            {critical > 0 && (
                                                <div
                                                    className="w-full bg-amber-600 transition-[height]"
                                                    style={{
                                                        height: `${Math.max(criticalPx, 4)}px`,
                                                    }}
                                                />
                                            )}
                                            {warnings > 0 && (
                                                <div
                                                    className="w-full bg-amber-400 transition-[height]"
                                                    style={{
                                                        height: `${Math.max(warningPx, 4)}px`,
                                                    }}
                                                />
                                            )}
                                            {total === 0 && (
                                                <div className="w-full h-[2px] bg-slate-200" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex gap-1.5 text-[10px] font-mono text-slate-500 border-t border-slate-100 pt-2">
                            {trends.map((bucket, idx) => (
                                <div
                                    key={`label-${bucket.period ?? idx}-${idx}`}
                                    className="flex-1 text-center truncate tabular-nums"
                                >
                                    {formatPeriodLabel(bucket.period, interval)}
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-center gap-5 pt-1 text-[11px] font-mono text-slate-600">
                            <span className="inline-flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-xs bg-amber-400" />
                                <span>{t("trends.warning")}</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-xs bg-amber-600" />
                                <span>{t("trends.critical")}</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-xs bg-red-600" />
                                <span>{t("trends.emergency")}</span>
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </ChamferCard>
    );
}

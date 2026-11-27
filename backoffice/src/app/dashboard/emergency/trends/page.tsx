"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
    Activity,
    AlertTriangle,
    ShieldAlert,
    AlertOctagon,
    Lightbulb,
    TrendingUp,
    TrendingDown,
    BarChart3,
    PieChart,
    Clock,
    CheckCircle2,
} from "lucide-react";
import {
    PageHeader,
    ChamferCard,
    CustomSelect,
    EmptyState,
    ErrorState,
    KpiStrip,
    TacticalCallout,
    type KpiItem,
} from "@/components/ui";
import { EmergencyNavTabs } from "@/components/emergency/EmergencyNavTabs";
import { useEmergencyStatsRange, useEmergencyTrendsRange, useDronesAll } from "@/hooks";
import { EMERGENCY_SEVERITY, EMERGENCY_TYPES, type EmergencyType } from "@/types";

type TimeRangeKey = "7d" | "30d" | "90d";
type IntervalKey = "day" | "week" | "month";

interface AutomatedInsight {
    tone: "info" | "warning" | "success";
    message: string;
}

function computeDateWindow(range: TimeRangeKey) {
    const now = new Date();
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return {
        from: fromDate.toISOString(),
        to: now.toISOString(),
    };
}

function formatPeriodLabel(period: string | undefined, interval: IntervalKey): string {
    if (!period) return "—";
    if (interval === "day") {
        const d = new Date(period);
        if (!Number.isNaN(d.getTime())) {
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            return `${mm}/${dd}`;
        }
    }
    return period.length > 10 ? period.slice(0, 10) : period;
}

export default function EmergencyTrendsPage() {
    const t = useTranslations("emergency");
    const [timeRange, setTimeRange] = useState<TimeRangeKey>("30d");
    const [interval, setInterval] = useState<IntervalKey>("day");

    const timeRangeOptions = useMemo<{ value: TimeRangeKey; label: string }[]>(
        () => [
            { value: "7d", label: t("trends.range7d") },
            { value: "30d", label: t("trends.range30d") },
            { value: "90d", label: t("trends.range90d") },
        ],
        [t]
    );

    const intervalOptions = useMemo<{ value: IntervalKey; label: string }[]>(
        () => [
            { value: "day", label: t("trends.byDay") },
            { value: "week", label: t("trends.byWeek") },
            { value: "month", label: t("trends.byMonth") },
        ],
        [t]
    );

    const getTypeLabel = useMemo(
        () => (rawType: string) => {
            if ((EMERGENCY_TYPES as readonly string[]).includes(rawType)) {
                return t(`types.${rawType as EmergencyType}`);
            }
            return rawType.replace(/_/g, " ");
        },
        [t]
    );

    const dateWindow = useMemo(() => computeDateWindow(timeRange), [timeRange]);

    const {
        data: stats,
        isLoading: statsLoading,
        isError: statsError,
        refetch: refetchStats,
    } = useEmergencyStatsRange(dateWindow);
    const {
        data: trends = [],
        isLoading: trendsLoading,
        isError: trendsError,
        refetch: refetchTrends,
    } = useEmergencyTrendsRange({
        ...dateWindow,
        interval,
    });
    const { data: drones = [] } = useDronesAll();

    const droneMap = useMemo(
        () =>
            new Map(
                drones
                    .filter((d) => d.id)
                    .map((d) => [
                        d.id,
                        {
                            registration: d.registrationNumber || d.id.slice(0, 8),
                            model: d.model || d.manufacturer || "",
                        },
                    ])
            ),
        [drones]
    );

    const totals = useMemo(() => {
        const bySeverity = stats?.bySeverity ?? [];
        const getCount = (sev: string) =>
            Number(bySeverity.find((s) => s.severity?.toLowerCase() === sev)?.count ?? 0);
        const warnings = getCount(EMERGENCY_SEVERITY.WARNING);
        const critical = getCount(EMERGENCY_SEVERITY.CRITICAL);
        const emergencies = getCount(EMERGENCY_SEVERITY.EMERGENCY);
        const total = bySeverity.reduce((sum, s) => sum + Number(s.count ?? 0), 0);
        return { total, warnings, critical, emergencies };
    }, [stats]);

    const sortedTypes = useMemo(() => {
        return [...(stats?.byType ?? [])].sort((a, b) => Number(b.count) - Number(a.count));
    }, [stats]);

    const sortedDrones = useMemo(() => {
        return [...(stats?.byDrone ?? [])].sort((a, b) => Number(b.count) - Number(a.count));
    }, [stats]);

    const resolutionSummary = useMemo(() => {
        const res = stats?.resolutionStats ?? [];
        const successful = Number(res.find((r) => r.success === true)?.count ?? 0);
        const failed = Number(res.find((r) => r.success === false)?.count ?? 0);
        const total = successful + failed;
        const rate = total > 0 ? (successful / total) * 100 : null;
        return { successful, failed, total, rate };
    }, [stats]);

    const insights = useMemo<AutomatedInsight[]>(() => {
        const list: AutomatedInsight[] = [];

        if (trends.length >= 2) {
            const sampleSize = Math.min(3, Math.floor(trends.length / 2) || 1);
            const recentAvg =
                trends.slice(-sampleSize).reduce((sum, t) => sum + Number(t.total ?? 0), 0) /
                sampleSize;
            const earlierAvg =
                trends.slice(0, sampleSize).reduce((sum, t) => sum + Number(t.total ?? 0), 0) /
                sampleSize;
            const pctChange = ((recentAvg - earlierAvg) / (earlierAvg || 1)) * 100;

            if (pctChange > 20) {
                list.push({
                    tone: "warning",
                    message: t("trends.insightIncreased", { pct: Math.round(pctChange) }),
                });
            } else if (pctChange < -20) {
                list.push({
                    tone: "success",
                    message: t("trends.insightDecreased", { pct: Math.round(Math.abs(pctChange)) }),
                });
            }
        }

        if (sortedTypes.length > 0) {
            const top = sortedTypes[0];
            list.push({
                tone: "info",
                message: t("trends.insightTopType", {
                    category: getTypeLabel(top.type),
                    count: top.count,
                }),
            });
        }

        if (sortedDrones.length > 0 && Number(sortedDrones[0].count) > 5) {
            const topDrone = sortedDrones[0];
            const info = droneMap.get(topDrone.droneId);
            const label = info?.registration ?? `DRN-${topDrone.droneId.slice(0, 8).toUpperCase()}`;
            list.push({
                tone: "warning",
                message: t("trends.insightTopDrone", { label, count: topDrone.count }),
            });
        }

        const avgResp = stats?.avgResponseTimeSeconds ?? 0;
        if (avgResp > 30) {
            list.push({
                tone: "warning",
                message: t("trends.insightHighLatency", { sec: Math.round(avgResp) }),
            });
        } else if (avgResp > 0) {
            list.push({
                tone: "success",
                message: t("trends.insightGoodLatency", { sec: Math.round(avgResp) }),
            });
        }

        return list;
    }, [stats, trends, sortedTypes, sortedDrones, droneMap, t, getTypeLabel]);

    const maxTrendTotal = useMemo(
        () => Math.max(...trends.map((item) => Number(item.total ?? 0)), 1),
        [trends]
    );

    const totalByType = useMemo(
        () => sortedTypes.reduce((sum, item) => sum + Number(item.count ?? 0), 0),
        [sortedTypes]
    );

    const loading = statsLoading || trendsLoading;

    const kpiItems: KpiItem[] = [
        {
            id: "total",
            label: t("trends.kpiTotal"),
            value: totals.total,
            subValue: timeRange.toUpperCase(),
            icon: Activity,
        },
        {
            id: "warnings",
            label: t("trends.kpiWarnings"),
            value: totals.warnings,
            subValue: t("trends.kpiAdvisory"),
            icon: AlertTriangle,
            iconClassName: totals.warnings > 0 ? "text-amber-500" : undefined,
        },
        {
            id: "critical",
            label: t("trends.kpiCritical"),
            value: totals.critical,
            subValue: t("trends.kpiHighPriority"),
            icon: ShieldAlert,
            iconClassName: totals.critical > 0 ? "text-amber-600" : undefined,
        },
        {
            id: "emergencies",
            label: t("trends.kpiEmergencies"),
            value: totals.emergencies,
            subValue: t("trends.kpiFailsafe"),
            icon: AlertOctagon,
            iconClassName: totals.emergencies > 0 ? "text-red-600" : undefined,
        },
        {
            id: "avg-response",
            label: t("trends.kpiAvgResponse"),
            value:
                stats?.avgResponseTimeSeconds != null && stats.avgResponseTimeSeconds > 0
                    ? `${Math.round(stats.avgResponseTimeSeconds)}s`
                    : "—",
            subValue: t("trends.kpiLatency"),
            icon: Clock,
        },
        {
            id: "success-rate",
            label: t("trends.kpiSuccessRate"),
            value: resolutionSummary.rate !== null ? `${resolutionSummary.rate.toFixed(1)}%` : "—",
            subValue:
                resolutionSummary.total > 0
                    ? t("trends.kpiOkRatio", {
                          ok: resolutionSummary.successful,
                          total: resolutionSummary.total,
                      })
                    : t("trends.kpiNoActions"),
            icon: CheckCircle2,
            iconClassName:
                resolutionSummary.rate !== null && resolutionSummary.rate >= 90
                    ? "text-emerald-600"
                    : undefined,
        },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-5 w-full">
            <PageHeader title={t("title")}>
                <div className="w-36">
                    <CustomSelect
                        id="trend-time-range"
                        ariaLabel={t("trends.timeRangeAria")}
                        value={timeRange}
                        onValueChange={(v) => setTimeRange(v as TimeRangeKey)}
                        options={timeRangeOptions}
                    />
                </div>

                <div className="w-32">
                    <CustomSelect
                        id="trend-interval"
                        ariaLabel={t("trends.intervalAria")}
                        value={interval}
                        onValueChange={(v) => setInterval(v as IntervalKey)}
                        options={intervalOptions}
                    />
                </div>
            </PageHeader>

            <EmergencyNavTabs />

            {statsError && trendsError ? (
                <ErrorState
                    title={t("trends.loadErrorTitle")}
                    description={t("trends.loadErrorDesc")}
                    onRetry={() => {
                        refetchStats();
                        refetchTrends();
                    }}
                />
            ) : (
                <>
                    <KpiStrip items={kpiItems} loading={loading} columns={6} />

                    {insights.length > 0 && (
                        <div className="flex flex-col gap-2">
                            {insights.map((insight, idx) => (
                                <TacticalCallout
                                    key={idx}
                                    tone={insight.tone}
                                    icon={
                                        insight.tone === "warning"
                                            ? TrendingUp
                                            : insight.tone === "success"
                                              ? TrendingDown
                                              : Lightbulb
                                    }
                                    title={insight.message}
                                />
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
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
                                                const emergencyPx = Math.round(
                                                    (emergencies / maxTrendTotal) * 148
                                                );
                                                const criticalPx = Math.round(
                                                    (critical / maxTrendTotal) * 148
                                                );
                                                const warningPx = Math.round(
                                                    (warnings / maxTrendTotal) * 148
                                                );

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
                                                                    className="w-full bg-red-600 transition-all"
                                                                    style={{
                                                                        height: `${Math.max(emergencyPx, 4)}px`,
                                                                    }}
                                                                />
                                                            )}
                                                            {critical > 0 && (
                                                                <div
                                                                    className="w-full bg-amber-600 transition-all"
                                                                    style={{
                                                                        height: `${Math.max(criticalPx, 4)}px`,
                                                                    }}
                                                                />
                                                            )}
                                                            {warnings > 0 && (
                                                                <div
                                                                    className="w-full bg-amber-400 transition-all"
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

                        <ChamferCard size="lg" className="w-full">
                            <div className="p-5 flex flex-col gap-4 h-full">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                                        {t("trends.byTypeHeading")}
                                    </span>
                                    <span className="text-[11px] font-mono text-slate-400">
                                        {sortedTypes.length === 1
                                            ? t("trends.categorySingle")
                                            : t("trends.categoryPlural", {
                                                  count: sortedTypes.length,
                                              })}
                                    </span>
                                </div>

                                {sortedTypes.length === 0 ? (
                                    <EmptyState
                                        compact
                                        icon={PieChart}
                                        title={t("trends.noTypeTitle")}
                                        description={t("trends.noTypeDesc")}
                                    />
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {sortedTypes.slice(0, 8).map((item) => {
                                            const count = Number(item.count ?? 0);
                                            const pct =
                                                totalByType > 0
                                                    ? Math.round((count / totalByType) * 100)
                                                    : 0;
                                            return (
                                                <div
                                                    key={item.type}
                                                    className="flex flex-col gap-1"
                                                >
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="font-medium text-slate-800">
                                                            {getTypeLabel(item.type)}
                                                        </span>
                                                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                                                            {count}{" "}
                                                            <span className="text-slate-400 font-normal">
                                                                ({pct}%)
                                                            </span>
                                                        </span>
                                                    </div>
                                                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-slate-800 transition-all"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </ChamferCard>
                    </div>

                    <ChamferCard size="lg" className="w-full">
                        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                                {t("trends.byAircraftHeading")}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                                {t("trends.topUnits", {
                                    count: Math.min(sortedDrones.length, 8),
                                })}
                            </span>
                        </div>

                        {sortedDrones.length === 0 ? (
                            <EmptyState
                                compact
                                icon={Activity}
                                title={t("trends.noAircraftTitle")}
                                description={t("trends.noAircraftDesc")}
                            />
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--color-border-default)]">
                                {sortedDrones.slice(0, 8).map((entry) => {
                                    const info = droneMap.get(entry.droneId);
                                    const reg =
                                        info?.registration ??
                                        (entry.droneId.length > 12
                                            ? `DRN-${entry.droneId.slice(0, 8).toUpperCase()}`
                                            : entry.droneId);
                                    return (
                                        <div
                                            key={entry.droneId}
                                            className="p-4 bg-[var(--color-surface-panel)] flex flex-col gap-1"
                                        >
                                            <span className="font-mono text-xs font-bold text-slate-900 truncate">
                                                {reg}
                                            </span>
                                            {info?.model && (
                                                <span className="text-[11px] text-slate-500 truncate">
                                                    {info.model}
                                                </span>
                                            )}
                                            <div className="flex items-baseline gap-1.5 mt-1.5">
                                                <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
                                                    {entry.count}
                                                </span>
                                                <span className="text-[11px] font-mono text-slate-500 uppercase">
                                                    {t("trends.incidentsUnit")}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </ChamferCard>
                </>
            )}
        </div>
    );
}

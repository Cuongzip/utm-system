"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
    Activity,
    AlertTriangle,
    ShieldAlert,
    AlertOctagon,
    Clock,
    CheckCircle2,
} from "lucide-react";
import type { KpiItem } from "@/components/ui";
import { useEmergencyStatsRange, useEmergencyTrendsRange, useDronesAll } from "@/hooks";
import { EMERGENCY_SEVERITY, EMERGENCY_TYPES, type EmergencyType } from "@/types";

export type TimeRangeKey = "7d" | "30d" | "90d";
export type IntervalKey = "day" | "week" | "month";

interface AutomatedInsight {
    tone: "info" | "warning" | "success";
    message: string;
}

export interface DroneSummaryInfo {
    registration: string;
    model: string;
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

export function formatPeriodLabel(period: string | undefined, interval: IntervalKey): string {
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

export function useEmergencyTrendsAnalytics() {
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

    const droneMap = useMemo<ReadonlyMap<string, DroneSummaryInfo>>(
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
                trends.slice(-sampleSize).reduce((sum, item) => sum + Number(item.total ?? 0), 0) /
                sampleSize;
            const earlierAvg =
                trends
                    .slice(0, sampleSize)
                    .reduce((sum, item) => sum + Number(item.total ?? 0), 0) / sampleSize;
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
        },
        {
            id: "critical",
            label: t("trends.kpiCritical"),
            value: totals.critical,
            subValue: t("trends.kpiHighPriority"),
            icon: ShieldAlert,
        },
        {
            id: "emergencies",
            label: t("trends.kpiEmergencies"),
            value: totals.emergencies,
            subValue: t("trends.kpiFailsafe"),
            icon: AlertOctagon,
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
        },
    ];

    return {
        timeRange,
        setTimeRange,
        interval,
        setInterval,
        timeRangeOptions,
        intervalOptions,
        getTypeLabel,
        trends,
        droneMap,
        sortedTypes,
        sortedDrones,
        insights,
        maxTrendTotal,
        totalByType,
        loading,
        kpiItems,
        statsError,
        trendsError,
        refetchStats,
        refetchTrends,
    };
}

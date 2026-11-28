"use client";

import { useTranslations } from "next-intl";
import { Lightbulb, TrendingUp, TrendingDown } from "lucide-react";
import { PageHeader, CustomSelect, ErrorState, KpiStrip, TacticalCallout } from "@/components/ui";
import { EmergencyNavTabs } from "@/components/emergency/EmergencyNavTabs";
import {
    useEmergencyTrendsAnalytics,
    type IntervalKey,
    type TimeRangeKey,
} from "./useEmergencyTrendsAnalytics";
import { IncidentSeverityTimelineCard } from "./IncidentSeverityTimelineCard";
import { IncidentCategoryBreakdownCard } from "./IncidentCategoryBreakdownCard";
import { TopAircraftIncidentsCard } from "./TopAircraftIncidentsCard";

export function EmergencyTrendsView() {
    const t = useTranslations("emergency");
    const {
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
    } = useEmergencyTrendsAnalytics();

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
                        <IncidentSeverityTimelineCard
                            trends={trends}
                            interval={interval}
                            maxTrendTotal={maxTrendTotal}
                        />

                        <IncidentCategoryBreakdownCard
                            sortedTypes={sortedTypes}
                            totalByType={totalByType}
                            getTypeLabel={getTypeLabel}
                        />
                    </div>

                    <TopAircraftIncidentsCard sortedDrones={sortedDrones} droneMap={droneMap} />
                </>
            )}
        </div>
    );
}

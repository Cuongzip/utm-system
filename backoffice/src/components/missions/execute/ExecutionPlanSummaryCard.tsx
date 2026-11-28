"use client";

import { useTranslations } from "next-intl";
import { Skeleton, StatusBadge } from "@/components/ui";
import { formatDistance } from "@/utils";
import { FEASIBILITY_VERDICT, type MissionExecutionPlan } from "@/types";

interface ExecutionPlanSummaryCardProps {
    plan?: MissionExecutionPlan;
    planLoading: boolean;
    planError: boolean;
    globalSummaryWarnings: string[];
}

export function ExecutionPlanSummaryCard({
    plan,
    planLoading,
    planError,
    globalSummaryWarnings,
}: ExecutionPlanSummaryCardProps) {
    const t = useTranslations("missions");

    if (planLoading && !plan) {
        return (
            <div
                role="status"
                aria-busy="true"
                aria-label={t("executeModal.calculating")}
                className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-subtle)] p-3.5 space-y-3"
            >
                <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border-default)]">
                    <Skeleton className="h-3.5 w-36" />
                    <Skeleton className="h-5 w-20" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {Array.from({ length: 3 }).map((_, idx) => (
                        <div key={idx} className="flex flex-col gap-1.5">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    ))}
                </div>
                <span className="sr-only">{t("executeModal.calculating")}</span>
            </div>
        );
    }

    if (planError || !plan) {
        return (
            <div className="p-3 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-subtle)] text-xs text-slate-600">
                {t("executeModal.previewUnavailable")}
            </div>
        );
    }

    const durationMinutes = Math.max(1, Math.round(plan.totalDurationSeconds / 60));

    return (
        <div className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-subtle)] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--color-border-default)]">
                <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-800">
                    {plan.totalLegs > 1
                        ? t("executeModal.previewHeaderPlural", { count: plan.totalLegs })
                        : t("executeModal.previewHeaderSingle", { count: plan.totalLegs })}
                </span>
                <StatusBadge
                    status={plan.feasible ? FEASIBILITY_VERDICT.GO : FEASIBILITY_VERDICT.MARGINAL}
                    label={
                        plan.feasible
                            ? t("executeModal.feasible")
                            : t("executeModal.reviewRequired")
                    }
                />
            </div>

            <div className="grid grid-cols-3 divide-x divide-[var(--color-border-default)] font-mono text-xs">
                <div className="pr-3">
                    <span className="text-[10px] text-slate-500 uppercase block">
                        {t("executeModal.distance")}
                    </span>
                    <span className="font-bold text-slate-900 tabular-nums">
                        {formatDistance(plan.totalDistanceMeters, 2)}
                    </span>
                </div>
                <div className="px-3">
                    <span className="text-[10px] text-slate-500 uppercase block">
                        {t("executeModal.estDuration")}
                    </span>
                    <span className="font-bold text-slate-900 tabular-nums">
                        {t("executeModal.minutesShort", { count: durationMinutes })}
                    </span>
                </div>
                <div className="pl-3">
                    <span className="text-[10px] text-slate-500 uppercase block">
                        {t("executeModal.estEnergy")}
                    </span>
                    <span className="font-bold text-slate-900 tabular-nums">
                        {Math.round(plan.totalEnergyWh)} Wh
                    </span>
                </div>
            </div>

            {globalSummaryWarnings.length > 0 && (
                <div className="pt-2 border-t border-[var(--color-border-default)] space-y-1 text-xs text-slate-600">
                    {globalSummaryWarnings.slice(0, 2).map((warn, idx) => (
                        <p key={idx}>{warn}</p>
                    ))}
                </div>
            )}
        </div>
    );
}

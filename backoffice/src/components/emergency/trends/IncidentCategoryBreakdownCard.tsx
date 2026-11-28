"use client";

import { useTranslations } from "next-intl";
import { PieChart } from "lucide-react";
import { ChamferCard, EmptyState } from "@/components/ui";
import type { EmergencyStatsVm } from "@/types";

interface IncidentCategoryBreakdownCardProps {
    sortedTypes: NonNullable<EmergencyStatsVm["byType"]>;
    totalByType: number;
    getTypeLabel: (rawType: string) => string;
}

export function IncidentCategoryBreakdownCard({
    sortedTypes,
    totalByType,
    getTypeLabel,
}: IncidentCategoryBreakdownCardProps) {
    const t = useTranslations("emergency");

    return (
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
                                totalByType > 0 ? Math.round((count / totalByType) * 100) : 0;
                            return (
                                <div key={item.type} className="flex flex-col gap-1">
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
                                            className="h-full rounded-full bg-slate-800 transition-[width]"
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
    );
}

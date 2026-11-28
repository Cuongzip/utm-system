"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { ChamferCard, ChamferButton } from "@/components/ui";
import type { CreateRebalancingPayload, RebalancingRecommendation } from "@/types";

interface RecommendationsCardProps {
    recommendations: RebalancingRecommendation[];
    isCreating: boolean;
    onDismiss: () => void;
    onQueue: (payload: CreateRebalancingPayload) => void;
}

export function RecommendationsCard({
    recommendations,
    isCreating,
    onDismiss,
    onQueue,
}: RecommendationsCardProps) {
    const t = useTranslations("fleet.rebalancing");

    return (
        <ChamferCard size="md">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                    {t("recommendationsTitle", { count: recommendations.length })}
                </span>
                <button
                    type="button"
                    onClick={onDismiss}
                    className="text-xs font-mono text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                    {t("dismiss")}
                </button>
            </div>

            {recommendations.length === 0 ? (
                <div className="px-4 py-3 text-xs font-mono text-slate-500">
                    {t("allHubsMeetReserve")}
                </div>
            ) : (
                <div className="divide-y divide-slate-200">
                    {recommendations.map((rec, idx) => (
                        <div
                            key={idx}
                            className="px-4 py-3 flex items-center justify-between gap-3"
                        >
                            <div className="min-w-0 flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                                    <span className="truncate">
                                        {rec.sourceHub?.hubName ?? t("sourceFallback")}
                                    </span>
                                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="truncate">
                                        {rec.targetHub?.hubName ?? t("targetFallback")}
                                    </span>
                                </div>
                                <div className="text-[11px] font-mono text-slate-600">
                                    {t("recMeta", {
                                        drone:
                                            rec.recommendedDrone?.registrationNumber ??
                                            t("autoFallback"),
                                        priority: rec.priority ?? 1,
                                    })}
                                    {rec.reason ? ` · ${rec.reason}` : ""}
                                </div>
                            </div>
                            <ChamferButton
                                variant="dark"
                                size="xs"
                                disabled={isCreating}
                                onClick={() =>
                                    onQueue({
                                        sourceHubId: rec.sourceHub?.hubId,
                                        targetHubId: rec.targetHub?.hubId,
                                        droneId: rec.recommendedDrone?.id,
                                        autoApprove: false,
                                    })
                                }
                            >
                                {t("queueBtn")}
                            </ChamferButton>
                        </div>
                    ))}
                </div>
            )}
        </ChamferCard>
    );
}

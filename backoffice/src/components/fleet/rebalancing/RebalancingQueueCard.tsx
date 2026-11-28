"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Check, Play, XCircle, CheckCircle2 } from "lucide-react";
import { ChamferCard, ChamferButton, StatusBadge, Skeleton } from "@/components/ui";
import { REBALANCING_STATUS, type RebalancingTask } from "@/types";
import { formatDateTime, compareCreatedDesc } from "@/utils";

interface RebalancingQueueCardProps {
    pendingTasks: RebalancingTask[];
    activeTasks: RebalancingTask[];
    loading: boolean;
    isBusyAction: boolean;
    resolveHubLabel: (id?: string) => string;
    resolveDroneLabel: (id?: string) => string;
    onApprove: (id: string) => void;
    onApproveAndExecute: (id: string) => void;
    onExecute: (id: string) => void;
    onComplete: (id: string) => void;
    onRequestCancel: (task: RebalancingTask) => void;
}

export function RebalancingQueueCard({
    pendingTasks,
    activeTasks,
    loading,
    isBusyAction,
    resolveHubLabel,
    resolveDroneLabel,
    onApprove,
    onApproveAndExecute,
    onExecute,
    onComplete,
    onRequestCancel,
}: RebalancingQueueCardProps) {
    const t = useTranslations("fleet.rebalancing");
    const tCommon = useTranslations("common");

    const queueTasks = useMemo(
        () => [
            ...[...pendingTasks]
                .sort(compareCreatedDesc)
                .map((task) => ({ task, kind: "pending" as const })),
            ...[...activeTasks]
                .sort(compareCreatedDesc)
                .map((task) => ({ task, kind: "active" as const })),
        ],
        [pendingTasks, activeTasks]
    );

    return (
        <ChamferCard size="md">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                    {t("activeQueueTitle")}
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                    {t("queueCounts", {
                        pending: pendingTasks.length,
                        active: activeTasks.length,
                    })}
                </span>
            </div>

            {loading ? (
                <div className="divide-y divide-slate-200">
                    {Array.from({ length: 2 }).map((_, idx) => (
                        <div
                            key={idx}
                            className="px-4 py-3 flex items-center justify-between gap-3"
                        >
                            <Skeleton className="h-4 w-56" />
                            <Skeleton className="h-6 w-24" />
                        </div>
                    ))}
                </div>
            ) : queueTasks.length === 0 ? (
                <div className="px-4 py-4 flex items-center gap-2 text-xs font-mono text-slate-500">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{t("queueEmpty")}</span>
                </div>
            ) : (
                <div className="divide-y divide-slate-200">
                    {queueTasks.map(({ task, kind }) => {
                        const isPending = kind === "pending";
                        const isApprovedOnly =
                            task.status?.toLowerCase() === REBALANCING_STATUS.APPROVED;

                        return (
                            <div
                                key={task.id}
                                className="px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                            >
                                <div className="min-w-0 flex flex-col gap-1">
                                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-900">
                                        <span className="truncate">
                                            {resolveHubLabel(task.sourceHubId)}
                                        </span>
                                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate">
                                            {resolveHubLabel(task.targetHubId)}
                                        </span>
                                        <StatusBadge
                                            status={
                                                task.status ??
                                                (isPending
                                                    ? REBALANCING_STATUS.PENDING
                                                    : REBALANCING_STATUS.IN_PROGRESS)
                                            }
                                        />
                                    </div>
                                    <div className="text-[11px] font-mono text-slate-500">
                                        {t("taskMeta", {
                                            drone: resolveDroneLabel(task.droneId),
                                            trigger: task.trigger || t("manualTrigger"),
                                            priority: task.priority ?? 1,
                                        })}
                                        {task.startedAt
                                            ? ` · ${t("startedAt", { time: formatDateTime(task.startedAt) })}`
                                            : ""}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                    <ChamferButton
                                        variant="outline"
                                        size="xs"
                                        disabled={isBusyAction || !task.id}
                                        onClick={() => onRequestCancel(task)}
                                    >
                                        <XCircle className="w-3 h-3 text-red-600" />
                                        <span>{tCommon("cancel")}</span>
                                    </ChamferButton>

                                    {isPending ? (
                                        <>
                                            <ChamferButton
                                                variant="outline"
                                                size="xs"
                                                disabled={isBusyAction || !task.id}
                                                onClick={() => task.id && onApprove(task.id)}
                                            >
                                                <Check className="w-3 h-3 text-emerald-600" />
                                                <span>{t("approve")}</span>
                                            </ChamferButton>
                                            <ChamferButton
                                                variant="dark"
                                                size="xs"
                                                disabled={isBusyAction || !task.id}
                                                onClick={() =>
                                                    task.id && onApproveAndExecute(task.id)
                                                }
                                            >
                                                <Play className="w-3 h-3" />
                                                <span>{t("approveAndExecute")}</span>
                                            </ChamferButton>
                                        </>
                                    ) : isApprovedOnly ? (
                                        <ChamferButton
                                            variant="dark"
                                            size="xs"
                                            disabled={isBusyAction || !task.id}
                                            onClick={() => task.id && onExecute(task.id)}
                                        >
                                            <Play className="w-3 h-3" />
                                            <span>{t("execute")}</span>
                                        </ChamferButton>
                                    ) : (
                                        <ChamferButton
                                            variant="dark"
                                            size="xs"
                                            disabled={isBusyAction || !task.id}
                                            onClick={() => task.id && onComplete(task.id)}
                                        >
                                            <CheckCircle2 className="w-3 h-3" />
                                            <span>{t("complete")}</span>
                                        </ChamferButton>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </ChamferCard>
    );
}

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, ArrowRight } from "lucide-react";
import {
    ChamferCard,
    StatusBadge,
    EmptyState,
    Pagination,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui";
import { usePagination } from "@/hooks";
import type { RebalancingTask } from "@/types";
import { formatDateTime, compareCreatedDesc } from "@/utils";

interface RebalancingHistoryCardProps {
    historyTasks: RebalancingTask[];
    resolveHubLabel: (id?: string) => string;
    resolveDroneLabel: (id?: string) => string;
}

export function RebalancingHistoryCard({
    historyTasks,
    resolveHubLabel,
    resolveDroneLabel,
}: RebalancingHistoryCardProps) {
    const t = useTranslations("fleet.rebalancing");

    const sortedHistory = useMemo(() => [...historyTasks].sort(compareCreatedDesc), [historyTasks]);

    const {
        currentPage,
        totalPages,
        totalItems,
        paginatedItems: pagedHistory,
        setCurrentPage,
    } = usePagination(sortedHistory);

    return (
        <ChamferCard size="md">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                    {t("historyTitle")}
                </span>
                <span className="text-xs font-mono text-slate-400">
                    {t("recordsCount", { count: historyTasks.length })}
                </span>
            </div>
            {historyTasks.length === 0 ? (
                <EmptyState
                    icon={RefreshCw}
                    title={t("noHistoryTitle")}
                    description={t("noHistoryDesc")}
                />
            ) : (
                <>
                    <Table fixed={false}>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("colDrone")}</TableHead>
                                <TableHead>{t("colRoute")}</TableHead>
                                <TableHead>{t("colTrigger")}</TableHead>
                                <TableHead>{t("colStatus")}</TableHead>
                                <TableHead>{t("colCreated")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pagedHistory.map((task) => (
                                <TableRow key={task.id}>
                                    <TableCell mono bold darkText>
                                        {resolveDroneLabel(task.droneId)}
                                    </TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                                            <span>{resolveHubLabel(task.sourceHubId)}</span>
                                            <ArrowRight className="w-3 h-3 text-slate-400" />
                                            <span>{resolveHubLabel(task.targetHubId)}</span>
                                        </span>
                                    </TableCell>
                                    <TableCell mono>{task.trigger || "—"}</TableCell>
                                    <TableCell>
                                        <StatusBadge status={task.status ?? "unknown"} />
                                    </TableCell>
                                    <TableCell mono>
                                        {task.createdOn ? formatDateTime(task.createdOn) : "—"}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        onPageChange={setCurrentPage}
                        itemLabel={t("itemLabel")}
                    />
                </>
            )}
        </ChamferCard>
    );
}

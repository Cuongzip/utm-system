"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    RefreshCw,
    ArrowRight,
    Check,
    Play,
    XCircle,
    Plus,
    CheckCircle2,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
    ChamferCard,
    ChamferButton,
    StatusBadge,
    EmptyState,
    Modal,
    ConfirmDialog,
    CustomSelect,
    Switch,
    Skeleton,
    Pagination,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui";
import { fleetService } from "@/services";
import { QUERY_KEYS, useHubsAll, useDronesAll, usePagination } from "@/hooks";
import {
    HUB_STATUS,
    REBALANCING_STATUS,
    type RebalancingRecommendation,
    type RebalancingTask,
} from "@/types";
import { formatDateTime, compareCreatedDesc } from "@/utils";

interface FleetRebalancingTabProps {
    pendingTasks: RebalancingTask[];
    activeTasks: RebalancingTask[];
    historyTasks: RebalancingTask[];
    loading: boolean;
}

export function FleetRebalancingTab({
    pendingTasks,
    activeTasks,
    historyTasks,
    loading,
}: FleetRebalancingTabProps) {
    const t = useTranslations("fleet.rebalancing");
    const tCommon = useTranslations("common");
    const queryClient = useQueryClient();
    const { data: hubs = [] } = useHubsAll();
    const { data: drones = [] } = useDronesAll();

    const [recommendations, setRecommendations] = useState<RebalancingRecommendation[] | null>(
        null
    );
    const [manualModalOpen, setManualModalOpen] = useState(false);
    const [sourceHubId, setSourceHubId] = useState("");
    const [targetHubId, setTargetHubId] = useState("");
    const [droneId, setDroneId] = useState("");
    const [autoApprove, setAutoApprove] = useState(false);
    const [taskToCancel, setTaskToCancel] = useState<RebalancingTask | null>(null);

    const activeHubs = useMemo(
        () => hubs.filter((h) => (h.status || "").toLowerCase() !== HUB_STATUS.INACTIVE),
        [hubs]
    );

    const hubNameMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const h of hubs) {
            map.set(h.id, h.name || h.code || h.id.slice(0, 8));
        }
        return map;
    }, [hubs]);

    const droneRegMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const d of drones) {
            map.set(d.id, d.registrationNumber || d.id.slice(0, 8));
        }
        return map;
    }, [drones]);

    const invalidateFleet = () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fleetOverview });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fleetRebalancingPending });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fleetRebalancingActive });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fleetRebalancingHistory });
    };

    const analyzeMutation = useMutation({
        mutationFn: () => fleetService.analyzeRebalancing(),
        meta: { defaultErrorMessage: t("analyzeError") },
        onSuccess: (data) => {
            setRecommendations(data);
            if (data.length === 0) {
                toast.success(t("balancedToast"));
            } else {
                toast.success(t("recommendationsToast", { count: data.length }));
            }
        },
    });

    const createMutation = useMutation({
        mutationFn: fleetService.createRebalancing,
        meta: { defaultErrorMessage: t("createError") },
        onSuccess: () => {
            toast.success(t("createdToast"));
            setManualModalOpen(false);
            setSourceHubId("");
            setTargetHubId("");
            setDroneId("");
            setAutoApprove(false);
            invalidateFleet();
        },
    });

    const approveAndExecuteMutation = useMutation({
        mutationFn: async (id: string) => {
            await fleetService.approveRebalancing(id);
            return fleetService.executeRebalancing(id);
        },
        meta: { defaultErrorMessage: t("approveExecuteError") },
        onSuccess: () => {
            toast.success(t("approvedExecutedToast"));
            invalidateFleet();
        },
    });

    const approveMutation = useMutation({
        mutationFn: (id: string) => fleetService.approveRebalancing(id),
        meta: { defaultErrorMessage: t("approveError") },
        onSuccess: () => {
            toast.success(t("approvedToast"));
            invalidateFleet();
        },
    });

    const executeMutation = useMutation({
        mutationFn: (id: string) => fleetService.executeRebalancing(id),
        meta: { defaultErrorMessage: t("executeError") },
        onSuccess: () => {
            toast.success(t("executedToast"));
            invalidateFleet();
        },
    });

    const completeMutation = useMutation({
        mutationFn: (id: string) => fleetService.completeRebalancing(id),
        meta: { defaultErrorMessage: t("completeError") },
        onSuccess: () => {
            toast.success(t("completedToast"));
            invalidateFleet();
        },
    });

    const cancelMutation = useMutation({
        mutationFn: (id: string) =>
            fleetService.cancelRebalancing(id, { reason: "Cancelled by operator" }),
        meta: { defaultErrorMessage: t("cancelError") },
        onSuccess: () => {
            toast.success(t("cancelledToast"));
            setTaskToCancel(null);
            invalidateFleet();
        },
    });

    const hubOptions = useMemo(
        () =>
            (activeHubs.length > 0 ? activeHubs : hubs).map((h) => ({
                value: h.id,
                label: `${h.code ? `${h.code} — ` : ""}${h.name || h.id}`,
            })),
        [activeHubs, hubs]
    );

    const eligibleDrones = useMemo(() => {
        if (!sourceHubId) return drones;
        const atSource = drones.filter((d) => d.homeHubId === sourceHubId);
        return atSource.length > 0 ? atSource : drones;
    }, [drones, sourceHubId]);

    const droneOptions = useMemo(
        () =>
            eligibleDrones.map((d) => ({
                value: d.id,
                label: `${d.registrationNumber}${d.model ? ` (${d.model})` : ""}`,
            })),
        [eligibleDrones]
    );

    const resolveHubLabel = (id?: string) => (id ? (hubNameMap.get(id) ?? id.slice(0, 8)) : "—");
    const resolveDroneLabel = (id?: string) => (id ? (droneRegMap.get(id) ?? id.slice(0, 8)) : "—");

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!sourceHubId || !targetHubId || !droneId) {
            toast.error(t("selectRequiredToast"));
            return;
        }
        if (sourceHubId === targetHubId) {
            toast.error(t("differentHubsToast"));
            return;
        }
        createMutation.mutate({ sourceHubId, targetHubId, droneId, autoApprove });
    };

    const isBusyAction =
        approveMutation.isPending ||
        approveAndExecuteMutation.isPending ||
        executeMutation.isPending ||
        completeMutation.isPending ||
        cancelMutation.isPending;

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

    const sortedHistory = useMemo(() => [...historyTasks].sort(compareCreatedDesc), [historyTasks]);

    const {
        currentPage,
        totalPages,
        totalItems,
        paginatedItems: pagedHistory,
        setCurrentPage,
    } = usePagination(sortedHistory);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                    {t("heading")}
                </h2>
                <div className="flex items-center gap-2">
                    <ChamferButton
                        variant="outline"
                        size="sm"
                        onClick={() => analyzeMutation.mutate()}
                        disabled={analyzeMutation.isPending}
                    >
                        {analyzeMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        <span>{t("analyzeNeeds")}</span>
                    </ChamferButton>
                    <ChamferButton
                        variant="dark"
                        size="sm"
                        onClick={() => setManualModalOpen(true)}
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t("manualRebalance")}</span>
                    </ChamferButton>
                </div>
            </div>

            {recommendations !== null && (
                <ChamferCard size="md">
                    <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                            {t("recommendationsTitle", { count: recommendations.length })}
                        </span>
                        <button
                            type="button"
                            onClick={() => setRecommendations(null)}
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
                                        disabled={createMutation.isPending}
                                        onClick={() =>
                                            createMutation.mutate({
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
            )}

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
                                            onClick={() => setTaskToCancel(task)}
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
                                                    onClick={() =>
                                                        task.id && approveMutation.mutate(task.id)
                                                    }
                                                >
                                                    <Check className="w-3 h-3 text-emerald-600" />
                                                    <span>{t("approve")}</span>
                                                </ChamferButton>
                                                <ChamferButton
                                                    variant="dark"
                                                    size="xs"
                                                    disabled={isBusyAction || !task.id}
                                                    onClick={() =>
                                                        task.id &&
                                                        approveAndExecuteMutation.mutate(task.id)
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
                                                onClick={() =>
                                                    task.id && executeMutation.mutate(task.id)
                                                }
                                            >
                                                <Play className="w-3 h-3" />
                                                <span>{t("execute")}</span>
                                            </ChamferButton>
                                        ) : (
                                            <ChamferButton
                                                variant="dark"
                                                size="xs"
                                                disabled={isBusyAction || !task.id}
                                                onClick={() =>
                                                    task.id && completeMutation.mutate(task.id)
                                                }
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

            <Modal
                isOpen={manualModalOpen}
                onClose={() => setManualModalOpen(false)}
                title={t("modalTitle")}
                onSubmit={handleManualSubmit}
                loading={createMutation.isPending}
                submitText={t("createTaskBtn")}
                loadingText={t("creatingTask")}
            >
                <div className="form-group">
                    <label className="form-label" htmlFor="rebalance-source-hub">
                        {t("sourceHubLabel")} <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                        id="rebalance-source-hub"
                        value={sourceHubId}
                        onValueChange={(val) => {
                            setSourceHubId(val);
                            setDroneId("");
                        }}
                        options={hubOptions}
                        placeholder={t("sourceHubPlaceholder")}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label" htmlFor="rebalance-target-hub">
                        {t("targetHubLabel")} <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                        id="rebalance-target-hub"
                        value={targetHubId}
                        onValueChange={setTargetHubId}
                        options={hubOptions.filter((o) => o.value !== sourceHubId)}
                        placeholder={t("targetHubPlaceholder")}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label" htmlFor="rebalance-drone">
                        {t("droneLabel")} <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                        id="rebalance-drone"
                        value={droneId}
                        onValueChange={setDroneId}
                        options={droneOptions}
                        placeholder={t("dronePlaceholder")}
                    />
                </div>
                <div className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <div>
                        <div className="text-xs font-semibold text-slate-800">
                            {t("autoApproveTitle")}
                        </div>
                        <div className="text-[11px] text-slate-500">{t("autoApproveDesc")}</div>
                    </div>
                    <Switch
                        label={t("autoApproveAria")}
                        checked={autoApprove}
                        onCheckedChange={setAutoApprove}
                    />
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={Boolean(taskToCancel)}
                onClose={() => setTaskToCancel(null)}
                onConfirm={() => {
                    if (taskToCancel?.id) cancelMutation.mutate(taskToCancel.id);
                }}
                title={t("cancelDialogTitle")}
                description={t("cancelDialogDesc")}
                confirmText={t("cancelDialogConfirm")}
                loading={cancelMutation.isPending}
            />
        </div>
    );
}

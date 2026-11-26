"use client";

import { useState, useMemo } from "react";
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
        meta: { defaultErrorMessage: "Failed to analyze rebalancing needs" },
        onSuccess: (data) => {
            setRecommendations(data);
            if (data.length === 0) {
                toast.success("Fleet distribution is balanced — no rebalancing needed.");
            } else {
                toast.success(`Found ${data.length} rebalancing recommendation(s).`);
            }
        },
    });

    const createMutation = useMutation({
        mutationFn: fleetService.createRebalancing,
        meta: { defaultErrorMessage: "Failed to create rebalancing task" },
        onSuccess: () => {
            toast.success("Rebalancing task created.");
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
        meta: { defaultErrorMessage: "Failed to approve and execute rebalancing" },
        onSuccess: () => {
            toast.success("Rebalancing approved and dispatched.");
            invalidateFleet();
        },
    });

    const approveMutation = useMutation({
        mutationFn: (id: string) => fleetService.approveRebalancing(id),
        meta: { defaultErrorMessage: "Failed to approve rebalancing task" },
        onSuccess: () => {
            toast.success("Rebalancing task approved.");
            invalidateFleet();
        },
    });

    const executeMutation = useMutation({
        mutationFn: (id: string) => fleetService.executeRebalancing(id),
        meta: { defaultErrorMessage: "Failed to execute rebalancing task" },
        onSuccess: () => {
            toast.success("Repositioning flight dispatched.");
            invalidateFleet();
        },
    });

    const completeMutation = useMutation({
        mutationFn: (id: string) => fleetService.completeRebalancing(id),
        meta: { defaultErrorMessage: "Failed to complete rebalancing task" },
        onSuccess: () => {
            toast.success("Rebalancing task completed and drone hub updated.");
            invalidateFleet();
        },
    });

    const cancelMutation = useMutation({
        mutationFn: (id: string) =>
            fleetService.cancelRebalancing(id, { reason: "Cancelled by operator" }),
        meta: { defaultErrorMessage: "Failed to cancel rebalancing task" },
        onSuccess: () => {
            toast.success("Rebalancing task cancelled.");
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
            toast.error("Select source hub, target hub, and drone.");
            return;
        }
        if (sourceHubId === targetHubId) {
            toast.error("Source and target hub must be different.");
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
                .map((t) => ({ task: t, kind: "pending" as const })),
            ...[...activeTasks]
                .sort(compareCreatedDesc)
                .map((t) => ({ task: t, kind: "active" as const })),
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
                    Hub Rebalancing Operations
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
                        <span>Analyze Needs</span>
                    </ChamferButton>
                    <ChamferButton
                        variant="dark"
                        size="sm"
                        onClick={() => setManualModalOpen(true)}
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Manual Rebalance</span>
                    </ChamferButton>
                </div>
            </div>

            {recommendations !== null && (
                <ChamferCard size="md">
                    <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                            Analysis Recommendations ({recommendations.length})
                        </span>
                        <button
                            type="button"
                            onClick={() => setRecommendations(null)}
                            className="text-xs font-mono text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                            Dismiss
                        </button>
                    </div>

                    {recommendations.length === 0 ? (
                        <div className="px-4 py-3 text-xs font-mono text-slate-500">
                            All active hubs meet minimum drone reserve thresholds. No repositioning
                            required.
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
                                                {rec.sourceHub?.hubName ?? "Source"}
                                            </span>
                                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span className="truncate">
                                                {rec.targetHub?.hubName ?? "Target"}
                                            </span>
                                        </div>
                                        <div className="text-[11px] font-mono text-slate-600">
                                            Drone:{" "}
                                            {rec.recommendedDrone?.registrationNumber ?? "Auto"} ·
                                            Priority {rec.priority ?? 1}
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
                                        Queue
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
                        Active Rebalancing Queue
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                        {pendingTasks.length} pending · {activeTasks.length} in progress
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
                        <span>
                            Fleet balanced across active vertiports — 0 pending or active transfers.
                        </span>
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
                                            Drone: {resolveDroneLabel(task.droneId)} · Trigger:{" "}
                                            {task.trigger || "manual"} · Priority{" "}
                                            {task.priority ?? 1}
                                            {task.startedAt
                                                ? ` · Started ${formatDateTime(task.startedAt)}`
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
                                            <span>Cancel</span>
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
                                                    <span>Approve</span>
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
                                                    <span>Approve &amp; Execute</span>
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
                                                <span>Execute</span>
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
                                                <span>Complete</span>
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
                        Rebalancing History
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                        {historyTasks.length} records
                    </span>
                </div>
                {historyTasks.length === 0 ? (
                    <EmptyState
                        icon={RefreshCw}
                        title="No Rebalancing History"
                        description="Completed or cancelled hub rebalancing transfers will appear here."
                    />
                ) : (
                    <>
                        <Table fixed={false}>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>DRONE</TableHead>
                                    <TableHead>TRANSFER ROUTE</TableHead>
                                    <TableHead>TRIGGER</TableHead>
                                    <TableHead>STATUS</TableHead>
                                    <TableHead>CREATED</TableHead>
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
                            itemLabel="transfers"
                        />
                    </>
                )}
            </ChamferCard>

            <Modal
                isOpen={manualModalOpen}
                onClose={() => setManualModalOpen(false)}
                title="Create Manual Rebalancing Task"
                onSubmit={handleManualSubmit}
                loading={createMutation.isPending}
                submitText="Create Task"
                loadingText="Creating..."
            >
                <div className="form-group">
                    <label className="form-label" htmlFor="rebalance-source-hub">
                        Source Hub <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                        id="rebalance-source-hub"
                        value={sourceHubId}
                        onValueChange={(val) => {
                            setSourceHubId(val);
                            setDroneId("");
                        }}
                        options={hubOptions}
                        placeholder="Select donor hub"
                    />
                </div>
                <div className="form-group">
                    <label className="form-label" htmlFor="rebalance-target-hub">
                        Target Hub <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                        id="rebalance-target-hub"
                        value={targetHubId}
                        onValueChange={setTargetHubId}
                        options={hubOptions.filter((o) => o.value !== sourceHubId)}
                        placeholder="Select destination hub"
                    />
                </div>
                <div className="form-group">
                    <label className="form-label" htmlFor="rebalance-drone">
                        Drone <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                        id="rebalance-drone"
                        value={droneId}
                        onValueChange={setDroneId}
                        options={droneOptions}
                        placeholder="Select drone to reposition"
                    />
                </div>
                <div className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <div>
                        <div className="text-xs font-semibold text-slate-800">Auto-approve</div>
                        <div className="text-[11px] text-slate-500">
                            Skip pending review and mark approved immediately
                        </div>
                    </div>
                    <Switch
                        label="Auto-approve rebalancing task"
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
                title="Cancel Rebalancing Task"
                description="Cancel this hub rebalancing transfer? Any scheduled repositioning will not proceed."
                confirmText="Cancel Task"
                loading={cancelMutation.isPending}
            />
        </div>
    );
}

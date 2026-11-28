"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ChamferButton, ConfirmDialog } from "@/components/ui";
import { fleetService } from "@/services";
import { QUERY_KEYS, useHubsAll, useDronesAll } from "@/hooks";
import { HUB_STATUS, type RebalancingRecommendation, type RebalancingTask } from "@/types";
import { RecommendationsCard } from "./rebalancing/RecommendationsCard";
import { RebalancingQueueCard } from "./rebalancing/RebalancingQueueCard";
import { RebalancingHistoryCard } from "./rebalancing/RebalancingHistoryCard";
import { ManualRebalanceModal } from "./rebalancing/ManualRebalanceModal";

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
    const queryClient = useQueryClient();
    const { data: hubs = [] } = useHubsAll();
    const { data: drones = [] } = useDronesAll();

    const [recommendations, setRecommendations] = useState<RebalancingRecommendation[] | null>(
        null
    );
    const [manualModalOpen, setManualModalOpen] = useState(false);
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

    const resolveHubLabel = (id?: string) => (id ? (hubNameMap.get(id) ?? id.slice(0, 8)) : "—");
    const resolveDroneLabel = (id?: string) => (id ? (droneRegMap.get(id) ?? id.slice(0, 8)) : "—");

    const isBusyAction =
        approveMutation.isPending ||
        approveAndExecuteMutation.isPending ||
        executeMutation.isPending ||
        completeMutation.isPending ||
        cancelMutation.isPending;

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
                <RecommendationsCard
                    recommendations={recommendations}
                    isCreating={createMutation.isPending}
                    onDismiss={() => setRecommendations(null)}
                    onQueue={(payload) => createMutation.mutate(payload)}
                />
            )}

            <RebalancingQueueCard
                pendingTasks={pendingTasks}
                activeTasks={activeTasks}
                loading={loading}
                isBusyAction={isBusyAction}
                resolveHubLabel={resolveHubLabel}
                resolveDroneLabel={resolveDroneLabel}
                onApprove={(id) => approveMutation.mutate(id)}
                onApproveAndExecute={(id) => approveAndExecuteMutation.mutate(id)}
                onExecute={(id) => executeMutation.mutate(id)}
                onComplete={(id) => completeMutation.mutate(id)}
                onRequestCancel={setTaskToCancel}
            />

            <RebalancingHistoryCard
                historyTasks={historyTasks}
                resolveHubLabel={resolveHubLabel}
                resolveDroneLabel={resolveDroneLabel}
            />

            <ManualRebalanceModal
                isOpen={manualModalOpen}
                onClose={() => setManualModalOpen(false)}
                hubs={hubs}
                activeHubs={activeHubs}
                drones={drones}
                loading={createMutation.isPending}
                onSubmitTask={(payload, onReset) =>
                    createMutation.mutate(payload, { onSuccess: onReset })
                }
            />

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

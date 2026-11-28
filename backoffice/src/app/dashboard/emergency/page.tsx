"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PageHeader, Switch, ChamferButton, ErrorState } from "@/components/ui";
import { ShieldCheck, Clock, Sliders } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    EmergencyKpiStrip,
    ActiveIncidentsList,
    EmergencyNavTabs,
    IncidentDetailsModal,
    ResponseProtocolsModal,
    EmergencyConfirmationModal,
} from "@/components/emergency";
import {
    QUERY_KEYS,
    useEmergencyActiveIncidents,
    useEmergencyPendingConfirmations,
    useEmergencyStats,
    useEmergencyConfig,
    usePermissions,
} from "@/hooks";
import { emergencyService } from "@/services/emergencyService";
import {
    INCIDENT_STATUS,
    CLOSED_INCIDENT_STATUSES,
    OPERATION_MODE,
    DEFAULT_OPERATION_MODE,
    type EmergencyIncidentVm,
    type OperationMode,
} from "@/types";

export default function EmergencyResponsePage() {
    const t = useTranslations("emergency");
    const queryClient = useQueryClient();
    const { canManageEmergencyProtocols } = usePermissions();

    const {
        data: activeIncidents = [],
        isLoading: isLoadingActive,
        isError: isActiveError,
        refetch: refetchActive,
    } = useEmergencyActiveIncidents();
    const { data: pendingConfirmations = [] } = useEmergencyPendingConfirmations();
    const { data: stats, isLoading: isLoadingStats } = useEmergencyStats();
    const { data: systemConfig } = useEmergencyConfig();

    const [selectedIncident, setSelectedIncident] = useState<EmergencyIncidentVm | null>(null);
    const [protocolsOpen, setProtocolsOpen] = useState(false);
    const [dismissedPendingIds, setDismissedPendingIds] = useState<Set<string>>(() => new Set());
    const [manualConfirmationOpen, setManualConfirmationOpen] = useState(false);

    const isSupervisedMode =
        (systemConfig?.mode ?? DEFAULT_OPERATION_MODE) === OPERATION_MODE.SUPERVISED;

    const setModeMutation = useMutation({
        mutationFn: (mode: OperationMode) => emergencyService.setMode(mode),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyConfig });
            if (res.mode === OPERATION_MODE.SUPERVISED) {
                toast.success(t("supervisedEnabledToast"));
            } else {
                toast.warning(t("autoEnabledToast"));
            }
        },
        meta: { defaultErrorMessage: t("modeUpdateFailed") },
    });

    const confirmMutation = useMutation({
        mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
            emergencyService.confirmIncident(id, { approved }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyActive });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyPending });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyStats });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyIncidents() });
            if (variables.approved) {
                toast.success(t("actionConfirmedToast"));
            } else {
                toast.success(t("actionRejectedToast"));
            }
        },
        meta: { defaultErrorMessage: t("confirmFailed") },
    });

    const resolveMutation = useMutation({
        mutationFn: ({ id, resolutionNotes }: { id: string; resolutionNotes?: string }) =>
            emergencyService.resolveIncident(id, { resolutionNotes }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyActive });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyPending });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyStats });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyIncidents() });
            toast.success(t("resolvedToast"));
        },
        meta: { defaultErrorMessage: t("resolveFailed") },
    });

    const handleToggleSupervisedMode = () => {
        const nextMode: OperationMode = isSupervisedMode
            ? OPERATION_MODE.AUTO
            : OPERATION_MODE.SUPERVISED;
        setModeMutation.mutate(nextMode);
    };

    const handleConfirmAction = (id: string, approved: boolean) => {
        confirmMutation.mutate({ id, approved });
    };

    const handleResolveIncident = (id: string, resolutionNotes?: string) => {
        resolveMutation.mutate({ id, resolutionNotes });
    };

    const hasUndismissedPending = pendingConfirmations.some(
        (p) => !dismissedPendingIds.has(p.incidentId)
    );
    const isConfirmationModalOpen =
        pendingConfirmations.length > 0 && (manualConfirmationOpen || hasUndismissedPending);

    const handleDismissConfirmationModal = () => {
        setManualConfirmationOpen(false);
        setDismissedPendingIds((prev) => {
            const next = new Set(prev);
            for (const p of pendingConfirmations) {
                next.add(p.incidentId);
            }
            return next;
        });
    };

    const activeCount = activeIncidents.filter(
        (i) => !i.status || !CLOSED_INCIDENT_STATUSES.includes(i.status)
    ).length;
    const pendingCount = activeIncidents.filter(
        (i) => i.status === INCIDENT_STATUS.PENDING_CONFIRMATION
    ).length;
    const resolvedCount =
        stats?.byStatus?.find((s) => s.status?.toLowerCase() === INCIDENT_STATUS.RESOLVED)?.count ??
        0;
    const avgResponseTime = Math.round(stats?.avgResponseTimeSeconds ?? 0);

    return (
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-5 w-full">
            <PageHeader title={t("title")}>
                {pendingConfirmations.length > 0 && (
                    <ChamferButton
                        variant="dark"
                        size="sm"
                        onClick={() => setManualConfirmationOpen(true)}
                    >
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t("reviewPending", { count: pendingConfirmations.length })}</span>
                    </ChamferButton>
                )}

                <ChamferButton variant="outline" size="sm" onClick={() => setProtocolsOpen(true)}>
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{t("protocols")}</span>
                </ChamferButton>

                <div
                    className="rounded-md flex items-center gap-3 px-3.5 py-1.5 bg-[var(--color-surface-panel)] border border-[var(--color-border-default)] select-none"
                    title={t("toggleSupervised")}
                >
                    <div className="flex items-center gap-2">
                        <ShieldCheck
                            className={`w-4 h-4 ${isSupervisedMode ? "text-slate-700" : "text-slate-400"}`}
                        />
                        <span className="text-xs font-mono font-bold text-slate-800">
                            {t("supervisedMode")}
                        </span>
                    </div>

                    <Switch
                        checked={isSupervisedMode}
                        disabled={!canManageEmergencyProtocols || setModeMutation.isPending}
                        onCheckedChange={() => handleToggleSupervisedMode()}
                        aria-label={t("toggleSupervised")}
                    />
                </div>
            </PageHeader>

            <EmergencyNavTabs />

            <EmergencyKpiStrip
                activeCount={activeCount}
                pendingCount={pendingCount}
                resolvedCount={resolvedCount}
                avgResponseTime={avgResponseTime}
                isLoading={isLoadingActive || isLoadingStats}
            />

            {isActiveError && activeIncidents.length === 0 ? (
                <ErrorState
                    title={t("activeLoadErrorTitle")}
                    description={t("activeLoadErrorDesc")}
                    onRetry={() => refetchActive()}
                />
            ) : (
                <ActiveIncidentsList
                    incidents={activeIncidents}
                    pendingConfirmations={pendingConfirmations}
                    onSelectIncident={setSelectedIncident}
                    onConfirmAction={handleConfirmAction}
                />
            )}

            <EmergencyConfirmationModal
                isOpen={isConfirmationModalOpen}
                pendingConfirmations={pendingConfirmations}
                onClose={handleDismissConfirmationModal}
                onConfirmAction={handleConfirmAction}
                submitting={confirmMutation.isPending}
            />

            <IncidentDetailsModal
                isOpen={Boolean(selectedIncident)}
                incident={selectedIncident}
                onClose={() => setSelectedIncident(null)}
                onConfirmAction={handleConfirmAction}
                onResolveIncident={handleResolveIncident}
            />

            <ResponseProtocolsModal
                isOpen={protocolsOpen}
                onClose={() => setProtocolsOpen(false)}
                canManageProtocols={canManageEmergencyProtocols}
            />
        </div>
    );
}

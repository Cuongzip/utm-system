"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    EmergencyKpiStrip,
    ActiveIncidentsList,
    EmergencyProtocolsStrip,
    IncidentDetailsModal,
    IncidentHistoryModal,
    TrendAnalysisModal,
    ResponseProtocolsModal,
    EMERGENCY_MODAL_TABS,
    type EmergencyProtocolType,
} from "@/components/emergency";
import {
    QUERY_KEYS,
    useEmergencyActiveIncidents,
    useEmergencyStats,
    useEmergencyConfig,
} from "@/hooks/useQueries";
import { emergencyService } from "@/services/emergencyService";
import {
    INCIDENT_STATUS,
    ACTIVE_INCIDENT_STATUSES,
    OPERATION_MODE,
    DEFAULT_OPERATION_MODE,
    type EmergencyIncidentVm,
    type OperationMode,
} from "@/types";

export default function EmergencyResponsePage() {
    const queryClient = useQueryClient();

    const { data: activeIncidents = [], isLoading: isLoadingActive } =
        useEmergencyActiveIncidents();
    const { data: stats, isLoading: isLoadingStats } = useEmergencyStats();
    const { data: systemConfig } = useEmergencyConfig();

    const [selectedIncident, setSelectedIncident] = useState<EmergencyIncidentVm | null>(null);
    const [activeProtocol, setActiveProtocol] = useState<EmergencyProtocolType | null>(null);

    const isSupervisedMode =
        (systemConfig?.mode ?? DEFAULT_OPERATION_MODE) === OPERATION_MODE.SUPERVISED;

    const setModeMutation = useMutation({
        mutationFn: (mode: OperationMode) => emergencyService.setMode(mode),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyConfig });
            if (res.mode === OPERATION_MODE.SUPERVISED) {
                toast.success(
                    "Supervised Mode enabled: Operator confirmation required for all critical flight actions"
                );
            } else {
                toast.warning(
                    "Autonomous Safety Mode enabled: Emergency failsafes execute automatically"
                );
            }
        },
        meta: { defaultErrorMessage: "Failed to update operation mode" },
    });

    const confirmMutation = useMutation({
        mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
            emergencyService.confirmIncident(id, approved),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyActive });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyStats });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyIncidents() });
            if (variables.approved) {
                toast.success("Failsafe action confirmed and dispatched to target drone");
            } else {
                toast.success("Incident resolved and safety separation logged");
            }
        },
        meta: { defaultErrorMessage: "Failed to process emergency incident action" },
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

    const activeCount = activeIncidents.filter(
        (i) => i.status && ACTIVE_INCIDENT_STATUSES.includes(i.status)
    ).length;
    const pendingCount = activeIncidents.filter(
        (i) => i.status === INCIDENT_STATUS.PENDING_CONFIRMATION
    ).length;
    const resolvedCount =
        stats?.byStatus?.find((s) => s.status?.toLowerCase() === INCIDENT_STATUS.RESOLVED)?.count ??
        0;
    const avgResponseTime = Math.round(stats?.avgResponseTimeSeconds ?? 0);

    return (
        <div className="p-8 flex flex-col gap-6 w-full">
            <PageHeader title="EMERGENCY RESPONSE">
                <div
                    onClick={handleToggleSupervisedMode}
                    className="rounded-lg flex items-center gap-3 px-3.5 py-1.5 bg-[var(--color-surface-panel)] border border-[var(--color-border-default)] hover:border-[var(--color-border-strong)] transition-all cursor-pointer select-none"
                    title="Toggle Operator Supervised Mode"
                >
                    <div className="flex items-center gap-2">
                        <ShieldCheck
                            className={`w-4 h-4 ${isSupervisedMode ? "text-emerald-600" : "text-slate-400"}`}
                        />
                        <span className="text-xs font-mono font-bold text-slate-800">
                            Supervised Mode
                        </span>
                    </div>

                    <div
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                            isSupervisedMode ? "bg-emerald-600" : "bg-slate-300"
                        }`}
                    >
                        <div
                            className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                isSupervisedMode ? "translate-x-4" : "translate-x-0"
                            }`}
                        />
                    </div>
                </div>
            </PageHeader>

            <EmergencyKpiStrip
                activeCount={activeCount}
                pendingCount={pendingCount}
                resolvedCount={resolvedCount}
                avgResponseTime={avgResponseTime}
                isLoading={isLoadingActive || isLoadingStats}
            />

            <ActiveIncidentsList
                incidents={activeIncidents}
                onSelectIncident={setSelectedIncident}
                onConfirmAction={handleConfirmAction}
            />

            <EmergencyProtocolsStrip onSelectProtocol={setActiveProtocol} />

            <IncidentDetailsModal
                isOpen={Boolean(selectedIncident)}
                incident={selectedIncident}
                onClose={() => setSelectedIncident(null)}
                onConfirmAction={handleConfirmAction}
            />

            <IncidentHistoryModal
                isOpen={activeProtocol === EMERGENCY_MODAL_TABS.HISTORY}
                onClose={() => setActiveProtocol(null)}
            />

            <TrendAnalysisModal
                isOpen={activeProtocol === EMERGENCY_MODAL_TABS.TRENDS}
                onClose={() => setActiveProtocol(null)}
            />

            <ResponseProtocolsModal
                isOpen={activeProtocol === EMERGENCY_MODAL_TABS.PROTOCOLS}
                onClose={() => setActiveProtocol(null)}
            />
        </div>
    );
}

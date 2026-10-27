"use client";

import { useMemo } from "react";
import { AlertTriangle, ShieldAlert, ShieldCheck, Check, Loader2 } from "lucide-react";
import { ChamferCard, StatusBadge, EmptyState } from "@/components/ui";
import { useActiveAlerts, QUERY_KEYS } from "@/hooks";
import { alertService } from "@/services";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatTime } from "@/utils/format";
import type { AlertVm } from "@/types";

export interface ActiveAlertsProps {
    alerts?: AlertVm[];
}

export function ActiveAlerts({ alerts: propAlerts }: ActiveAlertsProps) {
    const queryClient = useQueryClient();
    const { data: fetchedAlerts = [], isLoading } = useActiveAlerts();

    const alerts = propAlerts !== undefined ? propAlerts : fetchedAlerts;

    const acknowledgeMutation = useMutation({
        mutationFn: (alertId: string) => alertService.acknowledgeAlert(alertId),
        onSuccess: () => {
            toast.success("Alert acknowledged");
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.alertsActive });
        },
        onError: (err: Error) => {
            toast.error(err.message || "Failed to acknowledge alert");
        },
    });

    const activeCount = alerts.length;

    const sortedAlerts = useMemo(() => {
        return [...alerts].sort((a, b) => {
            const timeA = new Date(a.createdOn || 0).getTime();
            const timeB = new Date(b.createdOn || 0).getTime();
            return timeB - timeA;
        });
    }, [alerts]);

    return (
        <ChamferCard size="lg" className="h-[273px]">
            <div className="p-4 flex flex-col justify-between h-full">
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 font-mono tracking-wider">
                            <AlertTriangle
                                className={`h-4 w-4 ${activeCount > 0 ? "text-amber-500 animate-pulse" : "text-slate-400"}`}
                            />
                            <span>ACTIVE ALERTS</span>
                        </div>
                        <StatusBadge
                            status={activeCount > 0 ? "alert" : "online"}
                            label={activeCount > 0 ? `${activeCount} ACTIVE` : "NOMINAL"}
                            shape="rounded"
                        />
                    </div>

                    <div className="mt-2.5 overflow-y-auto max-h-[195px] space-y-2 pr-1 custom-scrollbar flex-1">
                        {isLoading && propAlerts === undefined ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center font-mono text-slate-400">
                                <Loader2 className="h-5 w-5 animate-spin mb-1 text-slate-400" />
                                <span className="text-[11px]">Monitoring alerts...</span>
                            </div>
                        ) : sortedAlerts.length === 0 ? (
                            <EmptyState
                                compact
                                icon={ShieldCheck}
                                title="No active alerts"
                                description="Airspace and drone telemetry nominal"
                                className="py-7"
                            />
                        ) : (
                            sortedAlerts.map((alert) => {
                                const severity = (alert.severity || "MEDIUM").toLowerCase();
                                const isCriticalOrHigh =
                                    severity === "critical" || severity === "high";

                                return (
                                    <div
                                        key={alert.id}
                                        className="p-2.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100/70 flex items-center justify-between gap-2.5 transition-colors"
                                    >
                                        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                                            <div
                                                className={`p-1 rounded shrink-0 ${
                                                    isCriticalOrHigh
                                                        ? "bg-rose-100 text-rose-600"
                                                        : "bg-amber-100 text-amber-700"
                                                }`}
                                            >
                                                <ShieldAlert className="h-3.5 w-3.5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center space-x-1.5">
                                                    <h4 className="text-[11px] font-bold font-mono text-slate-900 truncate">
                                                        {alert.alertType || "BREACH"}
                                                    </h4>
                                                    <StatusBadge
                                                        status={severity}
                                                        shape="chamfer"
                                                        showDot={false}
                                                        className="text-[9px] px-1.5 py-0 shrink-0"
                                                    />
                                                </div>
                                                <p
                                                    className="text-[10px] font-mono text-slate-500 truncate mt-0.5"
                                                    title={alert.message || undefined}
                                                >
                                                    {alert.message ||
                                                        "Operational anomaly detected"}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end space-y-1 shrink-0">
                                            <span className="text-[9px] text-slate-400 font-mono">
                                                {alert.createdOn
                                                    ? formatTime(alert.createdOn)
                                                    : "Just now"}
                                            </span>
                                            {alert.acknowledged ? (
                                                <StatusBadge
                                                    status="acknowledged"
                                                    shape="rounded"
                                                    showDot={false}
                                                    className="text-[9px] px-1.5 py-0"
                                                />
                                            ) : (
                                                <button
                                                    type="button"
                                                    disabled={acknowledgeMutation.isPending}
                                                    onClick={() =>
                                                        acknowledgeMutation.mutate(alert.id)
                                                    }
                                                    className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[9px] font-mono font-medium text-slate-700 shadow-2xs transition-colors cursor-pointer"
                                                >
                                                    <Check className="h-3 w-3 text-emerald-600" />
                                                    <span>ACK</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </ChamferCard>
    );
}

export default ActiveAlerts;

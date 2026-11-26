"use client";

import { useMemo } from "react";
import { AlertTriangle, ShieldCheck, Check } from "lucide-react";
import { ChamferCard, ChamferButton, StatusBadge, EmptyState, Skeleton } from "@/components/ui";
import { useActiveAlerts, QUERY_KEYS } from "@/hooks";
import { alertService } from "@/services";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib";
import { formatTime } from "@/utils";
import { ALERT_SEVERITY, ALERT_STATUS } from "@/types";

export interface ActiveAlertsProps {
    fixedHeight?: boolean;
}

export function ActiveAlerts({ fixedHeight = true }: ActiveAlertsProps) {
    const queryClient = useQueryClient();
    const { data: alerts = [], isLoading } = useActiveAlerts();

    const acknowledgeMutation = useMutation({
        mutationFn: (alertId: string) => alertService.acknowledgeAlert(alertId),
        onSuccess: () => {
            toast.success("Alert acknowledged");
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.alertsActive });
        },
        meta: { defaultErrorMessage: "Failed to acknowledge alert" },
    });

    const sortedAlerts = useMemo(() => {
        return [...alerts]
            .filter(
                (a) => a.status !== ALERT_STATUS.RESOLVED && a.status !== ALERT_STATUS.DISMISSED
            )
            .sort((a, b) => {
                const ackA = a.status === ALERT_STATUS.ACKNOWLEDGED ? 1 : 0;
                const ackB = b.status === ALERT_STATUS.ACKNOWLEDGED ? 1 : 0;
                if (ackA !== ackB) return ackA - ackB;
                const timeA = new Date(a.createdOn || 0).getTime();
                const timeB = new Date(b.createdOn || 0).getTime();
                return timeB - timeA;
            });
    }, [alerts]);

    const unacknowledgedCount = useMemo(
        () => sortedAlerts.filter((a) => a.status !== ALERT_STATUS.ACKNOWLEDGED).length,
        [sortedAlerts]
    );
    const totalCount = sortedAlerts.length;

    const headerBadge =
        unacknowledgedCount > 0
            ? { status: "alert" as const, label: `${unacknowledgedCount} UNACK` }
            : totalCount > 0
              ? { status: ALERT_STATUS.ACKNOWLEDGED, label: `${totalCount} ACKED` }
              : { status: "online" as const, label: "NOMINAL" };

    return (
        <ChamferCard size="lg" className={cn(fixedHeight ? "h-[272px]" : "w-full")}>
            <div className="p-4 flex flex-col justify-between h-full">
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 font-mono tracking-wider uppercase">
                            <AlertTriangle className="h-4 w-4 text-slate-500" />
                            <span>ACTIVE ALERTS</span>
                        </div>
                        <StatusBadge status={headerBadge.status} label={headerBadge.label} />
                    </div>

                    <div
                        className={cn(
                            "mt-1 overflow-y-auto divide-y divide-slate-200 pr-1 custom-scrollbar flex-1",
                            fixedHeight ? "max-h-[195px]" : "max-h-[320px]"
                        )}
                    >
                        {isLoading ? (
                            <div
                                role="status"
                                aria-busy="true"
                                aria-label="Loading alerts"
                                className="divide-y divide-slate-100"
                            >
                                {Array.from({ length: 3 }).map((_, idx) => (
                                    <div key={idx} className="py-2.5 flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <Skeleton className="h-3.5 w-28" />
                                            <Skeleton className="h-4 w-14" />
                                        </div>
                                        <Skeleton className="h-3 w-4/5" />
                                    </div>
                                ))}
                                <span className="sr-only">Loading alerts...</span>
                            </div>
                        ) : sortedAlerts.length === 0 ? (
                            <EmptyState
                                compact
                                icon={ShieldCheck}
                                title="No active alerts"
                                className="py-8"
                            />
                        ) : (
                            sortedAlerts.map((alert) => {
                                const isAcknowledged = alert.status === ALERT_STATUS.ACKNOWLEDGED;

                                return (
                                    <div
                                        key={alert.id}
                                        className={cn(
                                            "py-2.5 flex items-center justify-between gap-2.5",
                                            isAcknowledged && "opacity-65"
                                        )}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <h4 className="text-[11px] font-bold font-mono text-slate-900 truncate">
                                                    {(alert.alertType || "ALERT").replace(
                                                        /_/g,
                                                        " "
                                                    )}
                                                </h4>
                                                <StatusBadge
                                                    status={alert.severity || ALERT_SEVERITY.MEDIUM}
                                                />
                                            </div>
                                            <p
                                                className="text-[11px] text-slate-500 truncate mt-0.5"
                                                title={alert.message || undefined}
                                            >
                                                {alert.message || "Operational anomaly detected"}
                                            </p>
                                        </div>

                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                                                {alert.createdOn
                                                    ? formatTime(alert.createdOn)
                                                    : "Now"}
                                            </span>
                                            {isAcknowledged ? (
                                                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                                                    Acked
                                                </span>
                                            ) : (
                                                <ChamferButton
                                                    variant="outline"
                                                    size="xs"
                                                    disabled={acknowledgeMutation.isPending}
                                                    onClick={() =>
                                                        acknowledgeMutation.mutate(alert.id)
                                                    }
                                                >
                                                    <Check className="h-3 w-3 text-slate-600" />
                                                    <span>Ack</span>
                                                </ChamferButton>
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

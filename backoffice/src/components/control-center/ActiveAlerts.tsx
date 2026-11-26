"use client";

import { useMemo } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { ChamferCard, StatusBadge, EmptyState, Skeleton } from "@/components/ui";
import { useActiveAlerts, useFlightsAll, QUERY_KEYS } from "@/hooks";
import { alertService } from "@/services";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib";
import { formatDateTime } from "@/utils";
import { ALERT_SEVERITY, ALERT_STATUS, type AlertVm } from "@/types";

export interface ActiveAlertsProps {
    fixedHeight?: boolean;
}

const SHORT_ALERT_TITLES: Record<string, string> = {
    C2_LINK_LOST_CONTINGENT: "C2 LINK LOST",
    C2_LINK_LOST: "C2 LINK LOST",
    NO_TELEMETRY_STREAM: "TELEMETRY LOST",
    LATERAL_CORRIDOR_BREACH: "CORRIDOR BREACH",
    VERTICAL_ALTITUDE_BREACH: "ALTITUDE BREACH",
    "3D_VOLUME_BREACH": "VOLUME BREACH",
    CONFLICT_PROXIMITY: "CPA ADVISORY",
    COLLISION_WARNING: "COLLISION WARN",
    GEOFENCE_VIOLATION: "GEOFENCE BREACH",
    GEOFENCE_BREACH: "GEOFENCE BREACH",
    EMERGENCY_INCIDENT: "EMERGENCY",
    BATTERY_CRITICAL: "BATTERY CRIT",
};

interface CompactAlertSummary {
    title: string;
    failsafe: string | null;
    target: string | null;
    detail: string;
}

function summarizeAlert(alert: AlertVm, flightCodeMap: Map<string, string>): CompactAlertSummary {
    const rawType = (alert.alertType || "ALERT").toUpperCase();
    const title = SHORT_ALERT_TITLES[rawType] || rawType.replace(/_/g, " ");
    const rawMsg = alert.message || "";

    const failsafeMatch = rawMsg.match(/^AUTO FAILSAFE:\s*([A-Z0-9_-]+)/i);
    const failsafe = failsafeMatch ? failsafeMatch[1].toUpperCase() : null;

    let target = alert.flightId ? (flightCodeMap.get(alert.flightId) ?? null) : null;
    if (!target) {
        const pairMatch = rawMsg.match(
            /\bbetween\s+(FL(?:T)?-[A-Z0-9-]+)\s+and\s+(FL(?:T)?-[A-Z0-9-]+)/i
        );
        if (pairMatch) {
            target = `${pairMatch[1]} ↔ ${pairMatch[2]}`;
        } else {
            const singleMatch = rawMsg.match(/\b(FL(?:T)?-[A-Z0-9-]+)\b/i);
            if (singleMatch) {
                target = singleMatch[1];
            }
        }
    }

    const descentMatch = rawMsg.match(/\((-?\d+(?:\.\d+)?\s*m\/s)\)/i);
    if (descentMatch) {
        return { title, failsafe, target, detail: `Descent ${descentMatch[1]}` };
    }

    const lostSecMatch = rawMsg.match(/(?:lost|absent)\s+for\s+(\d+)\s*seconds?/i);
    if (lostSecMatch) {
        return { title, failsafe, target, detail: `No signal ${lostSecMatch[1]}s` };
    }

    const breachOffsetMatch = rawMsg.match(/exceeded .*? by\s+(\d+(?:\.\d+)?m)/i);
    if (breachOffsetMatch) {
        return { title, failsafe, target, detail: `Offset +${breachOffsetMatch[1]}` };
    }

    const cpaMatch = rawMsg.match(/CPA:\s*(\d+(?:\.\d+)?m)(?:\s+in\s+(\d+)\s*seconds?)?/i);
    if (cpaMatch) {
        const detail = cpaMatch[2] ? `CPA ${cpaMatch[1]} (${cpaMatch[2]}s)` : `CPA ${cpaMatch[1]}`;
        return { title, failsafe, target, detail };
    }

    const cleaned = rawMsg
        .replace(/^AUTO FAILSAFE:\s*[A-Z0-9_-]+\s+executing for\s+[a-z0-9_]+\.\s*/i, "")
        .replace(/^Tactical separation advisory:\s*/i, "")
        .replace(/\s*Immediate pilot correction required\.?/i, "")
        .replace(/\s*\(exceeded[^)]*\)/gi, "")
        .trim();

    return {
        title,
        failsafe,
        target,
        detail: cleaned || "Anomaly detected",
    };
}

export function ActiveAlerts({ fixedHeight = true }: ActiveAlertsProps) {
    const queryClient = useQueryClient();
    const { data: alerts = [], isLoading } = useActiveAlerts();
    const { data: flights = [] } = useFlightsAll();

    const flightCodeMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const f of flights) {
            if (f.id && f.flightNumber) {
                map.set(f.id, f.flightNumber);
            }
        }
        return map;
    }, [flights]);

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
        <ChamferCard
            size={fixedHeight ? "lg" : "md"}
            className={cn("w-full", fixedHeight ? "h-[272px]" : "lg:h-[312px]")}
        >
            <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center justify-between gap-3 shrink-0">
                <span className="text-xs font-bold text-[var(--color-text-primary)] font-mono tracking-wider uppercase">
                    Active Alerts
                </span>
                <StatusBadge status={headerBadge.status} label={headerBadge.label} />
            </div>

            <div className="overflow-y-auto overscroll-contain utm-scroll divide-y divide-[var(--color-border-subtle)] flex-1">
                {isLoading ? (
                    <div
                        role="status"
                        aria-busy="true"
                        aria-label="Loading alerts"
                        className="divide-y divide-[var(--color-border-subtle)]"
                    >
                        {Array.from({ length: 4 }).map((_, idx) => (
                            <div
                                key={idx}
                                className="px-4 py-2.5 flex items-center justify-between gap-3"
                            >
                                <div className="flex flex-col gap-1.5 flex-1">
                                    <Skeleton className="h-3.5 w-28" />
                                    <Skeleton className="h-3 w-44" />
                                </div>
                                <Skeleton className="h-6 w-12" />
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
                        const severity = alert.severity || ALERT_SEVERITY.MEDIUM;
                        const isCritical = severity === ALERT_SEVERITY.CRITICAL;
                        const summary = summarizeAlert(alert, flightCodeMap);
                        const timeShort = alert.createdOn
                            ? formatDateTime(alert.createdOn, "HH:mm") || "Now"
                            : "Now";

                        return (
                            <div
                                key={alert.id}
                                title={alert.message || undefined}
                                className={cn(
                                    "px-4 py-2 flex items-center justify-between gap-3 hover:bg-[var(--color-surface-subtle)] transition-colors",
                                    isAcknowledged && "opacity-60"
                                )}
                            >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            "w-[3px] h-7 rounded-full shrink-0",
                                            isAcknowledged
                                                ? "bg-slate-300"
                                                : isCritical
                                                  ? "bg-red-500"
                                                  : "bg-amber-500"
                                        )}
                                    />

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <h4 className="text-xs font-bold font-mono text-[var(--color-text-primary)] truncate">
                                                {summary.title}
                                            </h4>
                                            {summary.failsafe && (
                                                <span
                                                    className={cn(
                                                        "px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold leading-none shrink-0",
                                                        isCritical && !isAcknowledged
                                                            ? "bg-red-50 border-red-200/90 text-red-700"
                                                            : "bg-slate-100 border-slate-200 text-slate-600"
                                                    )}
                                                >
                                                    {summary.failsafe}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--color-text-muted)] truncate mt-0.5 tabular-nums">
                                            {summary.target && (
                                                <>
                                                    <span className="text-slate-600 font-medium truncate">
                                                        {summary.target}
                                                    </span>
                                                    <span className="shrink-0">·</span>
                                                </>
                                            )}
                                            <span className="truncate">{summary.detail}</span>
                                            <span className="shrink-0">· {timeShort}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="shrink-0">
                                    {isAcknowledged ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400 px-1">
                                            <Check className="w-3 h-3" aria-hidden="true" />
                                            <span>Ack</span>
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={acknowledgeMutation.isPending}
                                            onClick={() => acknowledgeMutation.mutate(alert.id)}
                                            className="h-6 px-2.5 rounded-[4px] border border-slate-300 bg-white hover:bg-slate-800 hover:text-white hover:border-slate-800 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-700 transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                        >
                                            Ack
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </ChamferCard>
    );
}

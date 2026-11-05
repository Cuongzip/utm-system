"use client";

import React from "react";
import {
    AlertTriangle,
    BatteryWarning,
    WifiOff,
    ShieldAlert,
    ChevronRight,
    ShieldCheck,
    Check,
    X,
} from "lucide-react";
import { ChamferCard, StatusBadge, EmptyState } from "@/components/ui";
import { formatRelativeTime } from "@/utils";
import type { EmergencyIncidentVm } from "@/types";

export interface ActiveIncidentsListProps {
    incidents: EmergencyIncidentVm[];
    onSelectIncident?: (incident: EmergencyIncidentVm) => void;
    onConfirmAction?: (id: string, approved: boolean) => void;
}

export function ActiveIncidentsList({
    incidents,
    onSelectIncident,
    onConfirmAction,
}: ActiveIncidentsListProps) {
    const getIncidentIcon = (incident: EmergencyIncidentVm) => {
        const type = incident.emergencyType || "";
        if (type.startsWith("battery")) return BatteryWarning;
        if (type.startsWith("signal") || type.startsWith("gps")) return WifiOff;
        if (incident.severity === "emergency" || incident.severity === "critical") {
            return ShieldAlert;
        }
        return AlertTriangle;
    };

    return (
        <ChamferCard size="lg" className="w-full">
            <div className="p-5 sm:p-6 flex flex-col gap-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <h2 className="text-xs sm:text-sm font-bold font-mono tracking-wider text-slate-900 uppercase">
                        ACTIVE INCIDENTS
                    </h2>
                </div>

                {incidents.length === 0 ? (
                    <EmptyState
                        icon={ShieldCheck}
                        title="No Active Incidents"
                        description="All monitored drone corridors and aircraft systems are currently operating within nominal parameters."
                    />
                ) : (
                    <div className="flex flex-col gap-3">
                        {incidents.map((incident) => {
                            const Icon = getIncidentIcon(incident);
                            const isAwaiting = incident.status === "pending_confirmation";
                            const isResolved = incident.status === "resolved";

                            return (
                                <div
                                    key={incident.id}
                                    onClick={() => onSelectIncident?.(incident)}
                                    className="chamfer-sm group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[var(--color-surface-subtle)] hover:bg-[var(--color-surface-card)] border border-[var(--color-border-default)] hover:border-[var(--color-border-strong)] transition-all cursor-pointer"
                                >
                                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                                        <div
                                            className={`w-10 h-10 rounded-md border flex items-center justify-center shrink-0 ${
                                                isAwaiting
                                                    ? "bg-amber-50 border-amber-200/80 text-amber-600"
                                                    : isResolved
                                                      ? "bg-emerald-50 border-emerald-200/80 text-emerald-600"
                                                      : "bg-rose-50 border-rose-200/80 text-rose-600"
                                            }`}
                                        >
                                            <Icon className="w-5 h-5" strokeWidth={2} />
                                        </div>

                                        <div className="flex flex-col min-w-0">
                                            <span className="font-semibold text-sm text-slate-900 group-hover:text-slate-800 truncate">
                                                {incident.message ||
                                                    incident.emergencyType?.replace(/_/g, " ")}
                                            </span>
                                            <div className="flex items-center gap-2 mt-0.5 text-xs font-mono text-slate-500">
                                                <span className="font-bold text-slate-700">
                                                    {incident.droneId}
                                                </span>
                                                <span>•</span>
                                                <span>
                                                    {formatRelativeTime(incident.detectedAt)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className="flex items-center gap-2.5 self-end sm:self-center shrink-0"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {incident.responseAction &&
                                            incident.responseAction !== "NONE" && (
                                                <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-slate-100 text-slate-700 border border-slate-300">
                                                    {incident.responseAction}
                                                </span>
                                            )}

                                        <StatusBadge
                                            status={
                                                isAwaiting
                                                    ? "warning"
                                                    : isResolved
                                                      ? "success"
                                                      : "alert"
                                            }
                                            label={
                                                isAwaiting
                                                    ? "AWAITING CONFIRMATION"
                                                    : incident.status
                                                      ? incident.status.toUpperCase()
                                                      : "ACTIVE"
                                            }
                                            shape="rounded"
                                        />

                                        {isAwaiting && onConfirmAction && (
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onConfirmAction(incident.id, true)
                                                    }
                                                    className="chamfer-sm px-2.5 py-1 text-xs font-mono font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer flex items-center gap-1"
                                                    title="Approve failsafe action"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                    <span>Confirm</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onConfirmAction(incident.id, false)
                                                    }
                                                    className="chamfer-sm px-2 py-1 text-xs font-mono font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                                                    title="Reject failsafe action"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                    <span>Reject</span>
                                                </button>
                                            </div>
                                        )}

                                        {!isAwaiting && (
                                            <button
                                                type="button"
                                                onClick={() => onSelectIncident?.(incident)}
                                                className="chamfer-sm px-2.5 py-1 text-xs font-mono font-bold bg-[var(--color-border-dark)] hover:bg-slate-800 text-white transition-colors cursor-pointer flex items-center gap-1"
                                                title="View incident diagnostics"
                                            >
                                                <span>Inspect</span>
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => onSelectIncident?.(incident)}
                                            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                                            aria-label="View Details"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </ChamferCard>
    );
}

export default ActiveIncidentsList;

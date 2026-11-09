"use client";

import { useMemo } from "react";
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
import { ChamferCard, ChamferButton, StatusBadge, EmptyState } from "@/components/ui";
import { formatRelativeTime } from "@/utils";
import { useDronesAll, useFlightsAll } from "@/hooks";
import {
    INCIDENT_STATUS,
    DEFAULT_INCIDENT_STATUS,
    EMERGENCY_SEVERITY,
    RESPONSE_ACTION,
    type EmergencyIncidentVm,
} from "@/types";

export interface ActiveIncidentsListProps {
    incidents: EmergencyIncidentVm[];
    onSelectIncident: (incident: EmergencyIncidentVm) => void;
    onConfirmAction: (id: string, approved: boolean) => void;
}

export function ActiveIncidentsList({
    incidents,
    onSelectIncident,
    onConfirmAction,
}: ActiveIncidentsListProps) {
    const { data: drones = [] } = useDronesAll();
    const { data: flights = [] } = useFlightsAll();

    const droneMap = useMemo(
        () =>
            new Map(
                drones
                    .filter((d) => d.id)
                    .map((d) => [d.id, d.registrationNumber || d.model || d.id])
            ),
        [drones]
    );

    const flightMap = useMemo(
        () => new Map(flights.filter((f) => f.id).map((f) => [f.id, f])),
        [flights]
    );

    const getIncidentIcon = (incident: EmergencyIncidentVm) => {
        const type = incident.emergencyType || "";
        if (type.startsWith("battery")) return BatteryWarning;
        if (type.startsWith("signal") || type.startsWith("gps")) return WifiOff;
        if (
            incident.severity === EMERGENCY_SEVERITY.EMERGENCY ||
            incident.severity === EMERGENCY_SEVERITY.CRITICAL
        ) {
            return ShieldAlert;
        }
        return AlertTriangle;
    };

    return (
        <ChamferCard size="lg" className="w-full">
            <div className="p-5 sm:p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xs sm:text-sm font-bold font-mono tracking-wider text-slate-900 uppercase">
                            ACTIVE INCIDENTS
                        </h2>
                    </div>
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
                            const isAwaiting =
                                incident.status === INCIDENT_STATUS.PENDING_CONFIRMATION;
                            const isResolved = incident.status === INCIDENT_STATUS.RESOLVED;

                            const flight = incident.flightId
                                ? flightMap.get(incident.flightId)
                                : undefined;
                            const flightNumText =
                                flight?.flightNumber ||
                                (incident.flightId && incident.flightId.length > 12
                                    ? `FLT-${incident.flightId.slice(0, 8).toUpperCase()}`
                                    : incident.flightId);
                            const effectiveDroneId = incident.droneId || flight?.droneId;
                            const droneRegText = effectiveDroneId
                                ? droneMap.get(effectiveDroneId) ||
                                  (effectiveDroneId.length > 12
                                      ? `DRN-${effectiveDroneId.slice(0, 8).toUpperCase()}`
                                      : effectiveDroneId)
                                : "Unknown Drone";

                            return (
                                <ChamferCard
                                    key={incident.id}
                                    size="sm"
                                    onClick={() => onSelectIncident(incident)}
                                    className="w-full cursor-pointer transition-all hover:bg-[var(--color-border-dark)] group"
                                    innerClassName="p-3.5 sm:p-4 bg-[var(--color-surface-subtle)] group-hover:bg-[var(--color-surface-card)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                                >
                                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                                        <div className="w-9 h-9 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-600 group-hover:text-slate-900 group-hover:bg-slate-200/60 transition-colors">
                                            <Icon className="w-4 h-4" />
                                        </div>

                                        <div className="flex flex-col min-w-0">
                                            <span className="font-semibold text-sm text-slate-900 group-hover:text-slate-800 truncate">
                                                {incident.message ||
                                                    incident.emergencyType?.replace(/_/g, " ")}
                                            </span>
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs font-mono text-slate-500">
                                                <span className="font-semibold text-slate-800">
                                                    Drone: {droneRegText}
                                                </span>
                                                {flightNumText && (
                                                    <>
                                                        <span className="text-slate-300">•</span>
                                                        <span className="text-slate-600">
                                                            Flight: {flightNumText}
                                                        </span>
                                                    </>
                                                )}
                                                <span className="text-slate-300">•</span>
                                                <span>
                                                    {formatRelativeTime(incident.detectedAt)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                                        {incident.responseAction &&
                                            incident.responseAction !== RESPONSE_ACTION.NONE && (
                                                <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-slate-100 text-slate-700 border border-slate-300">
                                                    {incident.responseAction}
                                                </span>
                                            )}

                                        <StatusBadge
                                            status={incident.status ?? DEFAULT_INCIDENT_STATUS}
                                            label={isAwaiting ? "AWAITING CONFIRMATION" : undefined}
                                            dotShape="circle"
                                        />

                                        {isAwaiting && (
                                            <div
                                                className="flex items-center gap-1.5"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <ChamferButton
                                                    size="xs"
                                                    variant="dark"
                                                    onClick={() =>
                                                        onConfirmAction(incident.id, true)
                                                    }
                                                    title="Approve failsafe action"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                    <span>Confirm</span>
                                                </ChamferButton>
                                                <ChamferButton
                                                    size="xs"
                                                    variant="outline"
                                                    onClick={() =>
                                                        onConfirmAction(incident.id, false)
                                                    }
                                                    title="Reject failsafe action"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                    <span>Reject</span>
                                                </ChamferButton>
                                            </div>
                                        )}

                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors shrink-0" />
                                    </div>
                                </ChamferCard>
                            );
                        })}
                    </div>
                )}
            </div>
        </ChamferCard>
    );
}

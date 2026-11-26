"use client";

import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    BatteryWarning,
    WifiOff,
    ShieldAlert,
    ChevronRight,
    ShieldCheck,
    Check,
    X,
    Clock,
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
    type PendingConfirmationVm,
} from "@/types";

export interface ActiveIncidentsListProps {
    incidents: EmergencyIncidentVm[];
    pendingConfirmations?: PendingConfirmationVm[];
    onSelectIncident: (incident: EmergencyIncidentVm) => void;
    onConfirmAction: (id: string, approved: boolean) => void;
}

export function ActiveIncidentsList({
    incidents,
    pendingConfirmations = [],
    onSelectIncident,
    onConfirmAction,
}: ActiveIncidentsListProps) {
    const { data: drones = [] } = useDronesAll();
    const { data: flights = [] } = useFlightsAll();
    const [nowMs, setNowMs] = useState(() => Date.now());

    const hasPending = useMemo(
        () =>
            incidents.some((i) => i.status === INCIDENT_STATUS.PENDING_CONFIRMATION) ||
            pendingConfirmations.length > 0,
        [incidents, pendingConfirmations]
    );

    useEffect(() => {
        if (!hasPending) return;
        const timer = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [hasPending]);

    const pendingTimeoutMap = useMemo(
        () => new Map(pendingConfirmations.map((p) => [p.incidentId, p.timeoutAt])),
        [pendingConfirmations]
    );

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
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2">
                <h2 className="text-xs font-bold font-mono tracking-wider text-slate-900 uppercase">
                    Active Emergency Incidents ({incidents.length})
                </h2>
                <StatusBadge
                    status={incidents.length > 0 ? "critical" : "online"}
                    label={incidents.length > 0 ? `${incidents.length} ACTIVE` : "NOMINAL"}
                />
            </div>

            {incidents.length === 0 ? (
                <EmptyState
                    icon={ShieldCheck}
                    title="No Active Incidents"
                    description="All monitored drone corridors and aircraft systems are operating within nominal parameters."
                />
            ) : (
                <div className="divide-y divide-slate-200">
                    {incidents.map((incident) => {
                        const Icon = getIncidentIcon(incident);
                        const isAwaiting = incident.status === INCIDENT_STATUS.PENDING_CONFIRMATION;

                        const timeoutIso =
                            pendingTimeoutMap.get(incident.id) || incident.confirmationTimeoutAt;
                        const secondsLeft =
                            isAwaiting && timeoutIso
                                ? Math.max(
                                      0,
                                      Math.ceil((new Date(timeoutIso).getTime() - nowMs) / 1000)
                                  )
                                : null;

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
                            <div
                                key={incident.id}
                                onClick={() => onSelectIncident(incident)}
                                className="px-4 py-3.5 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors cursor-pointer"
                            >
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectIncident(incident);
                                    }}
                                    className="flex items-start sm:items-center gap-3 min-w-0 flex-1 text-left cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                >
                                    <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-700">
                                        <Icon className="w-4 h-4" />
                                    </div>

                                    <div className="flex flex-col min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-semibold text-sm text-slate-900 truncate">
                                                {incident.message ||
                                                    incident.emergencyType?.replace(/_/g, " ")}
                                            </span>
                                            <StatusBadge
                                                status={incident.severity}
                                                label={incident.severity.toUpperCase()}
                                            />
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs font-mono text-slate-500">
                                            <span className="font-semibold text-slate-800">
                                                Drone: {droneRegText}
                                            </span>
                                            {flightNumText && (
                                                <>
                                                    <span className="text-slate-300">·</span>
                                                    <span className="text-slate-600">
                                                        Flight: {flightNumText}
                                                    </span>
                                                </>
                                            )}
                                            <span className="text-slate-300">·</span>
                                            <span>{formatRelativeTime(incident.detectedAt)}</span>
                                        </div>
                                    </div>
                                </button>

                                <div className="flex items-center flex-wrap gap-2 self-end sm:self-center shrink-0">
                                    {incident.responseAction &&
                                        incident.responseAction !== RESPONSE_ACTION.NONE && (
                                            <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-slate-100 text-slate-700 border border-slate-300">
                                                {incident.responseAction}
                                            </span>
                                        )}

                                    {secondsLeft !== null && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-slate-100 text-slate-800 border border-slate-300 tabular-nums">
                                            <Clock className="w-3 h-3 text-slate-600" />
                                            <span>{secondsLeft}s</span>
                                        </span>
                                    )}

                                    <StatusBadge
                                        status={incident.status ?? DEFAULT_INCIDENT_STATUS}
                                        label={isAwaiting ? "AWAITING CONFIRMATION" : undefined}
                                    />

                                    {isAwaiting && (
                                        <div
                                            className="flex items-center gap-1.5"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <ChamferButton
                                                size="xs"
                                                variant="dark"
                                                onClick={() => onConfirmAction(incident.id, true)}
                                                title="Approve failsafe action"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                                <span>Confirm</span>
                                            </ChamferButton>
                                            <ChamferButton
                                                size="xs"
                                                variant="outline"
                                                onClick={() => onConfirmAction(incident.id, false)}
                                                title="Reject failsafe action"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                                <span>Reject</span>
                                            </ChamferButton>
                                        </div>
                                    )}

                                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </ChamferCard>
    );
}

"use client";

import { useMemo } from "react";
import { ShieldCheck, Check, ArrowRight } from "lucide-react";
import { ChamferCard, ChamferButton, StatusBadge, EmptyState } from "@/components/ui";
import { formatDateTime, formatDistance, formatAltitude } from "@/utils";
import { useFlightsAll } from "@/hooks";
import { CONFLICT_STATUS, type Conflict } from "@/types";

export interface ActiveConflictsListProps {
    conflicts: Conflict[];
    onAcknowledge: (conflictId: string) => void;
    onResolve: (conflict: Conflict) => void;
    isAcknowledging?: boolean;
}

export function ActiveConflictsList({
    conflicts,
    onAcknowledge,
    onResolve,
    isAcknowledging = false,
}: ActiveConflictsListProps) {
    const { data: flights = [] } = useFlightsAll();

    const flightMap = useMemo(
        () => new Map(flights.filter((f) => f.id).map((f) => [f.id, f.flightNumber || f.id])),
        [flights]
    );

    if (conflicts.length === 0) {
        return (
            <ChamferCard size="md" innerClassName="p-8 text-center bg-white/70">
                <EmptyState
                    icon={ShieldCheck}
                    title="Airspace Clean & Clear"
                    description="No active separation breaches or airspace boundary violations detected."
                />
            </ChamferCard>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {conflicts.map((conflict) => {
                const isAcknowledged = conflict.status === CONFLICT_STATUS.ACKNOWLEDGED;
                const isResolving = conflict.status === CONFLICT_STATUS.RESOLVING;

                const primaryFlightLabel = conflict.primaryFlightId
                    ? flightMap.get(conflict.primaryFlightId) || conflict.primaryFlightId
                    : null;
                const secondaryFlightLabel = conflict.secondaryFlightId
                    ? flightMap.get(conflict.secondaryFlightId) || conflict.secondaryFlightId
                    : null;

                const formattedType = conflict.conflictType
                    ? conflict.conflictType.replace(/_/g, " ").toUpperCase()
                    : "AIRSPACE CONFLICT";

                const lifecycleStatus =
                    conflict.status === CONFLICT_STATUS.DETECTED ? "alert" : "normal";

                return (
                    <ChamferCard key={conflict.id} size="md">
                        <div className="p-4 flex flex-col justify-between h-full gap-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex flex-col gap-1.5 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {(primaryFlightLabel || secondaryFlightLabel) && (
                                            <div className="flex items-center gap-1.5 font-mono text-xs">
                                                {primaryFlightLabel && (
                                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-900 font-bold border border-slate-200">
                                                        {primaryFlightLabel}
                                                    </span>
                                                )}
                                                {primaryFlightLabel && secondaryFlightLabel && (
                                                    <ArrowRight className="w-3 h-3 text-slate-400" />
                                                )}
                                                {secondaryFlightLabel && (
                                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-900 font-bold border border-slate-200">
                                                        {secondaryFlightLabel}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        <h3 className="text-xs font-bold font-mono tracking-wider text-slate-900 uppercase">
                                            {formattedType}
                                        </h3>
                                    </div>

                                    {conflict.description && (
                                        <p className="text-xs text-slate-600 leading-relaxed font-sans">
                                            {conflict.description}
                                        </p>
                                    )}
                                </div>

                                <StatusBadge
                                    status={conflict.severity ?? "normal"}
                                    label={conflict.severity?.toUpperCase() || "UNKNOWN"}
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-100">
                                {conflict.separationDistance !== undefined && (
                                    <div>
                                        <span className="text-slate-400">Sep: </span>
                                        <span className="font-semibold text-slate-700">
                                            {formatDistance(conflict.separationDistance)}
                                        </span>
                                    </div>
                                )}
                                {conflict.verticalSeparation !== undefined && (
                                    <div>
                                        <span className="text-slate-400">Vert: </span>
                                        <span className="font-semibold text-slate-700">
                                            {formatAltitude(conflict.verticalSeparation)}
                                        </span>
                                    </div>
                                )}
                                {conflict.timeToConflictSec !== undefined &&
                                    conflict.timeToConflictSec > 0 && (
                                        <div>
                                            <span className="text-slate-400">Time: </span>
                                            <span className="font-semibold text-slate-700">
                                                {conflict.timeToConflictSec}s
                                            </span>
                                        </div>
                                    )}
                                {conflict.detectedAt && (
                                    <div>
                                        <span className="text-slate-400">Detected: </span>
                                        <span className="text-slate-700">
                                            {formatDateTime(conflict.detectedAt)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-1">
                                <StatusBadge
                                    status={lifecycleStatus}
                                    label={conflict.status?.toUpperCase() || "DETECTED"}
                                />

                                <div className="flex items-center gap-2">
                                    {!isAcknowledged && !isResolving && (
                                        <ChamferButton
                                            size="sm"
                                            variant="outline"
                                            clip="xs"
                                            onClick={() => onAcknowledge(conflict.id)}
                                            disabled={isAcknowledging}
                                        >
                                            <Check className="w-3.5 h-3.5 text-slate-600" />
                                            <span>Acknowledge</span>
                                        </ChamferButton>
                                    )}

                                    <ChamferButton
                                        size="sm"
                                        variant="dark"
                                        clip="sm"
                                        onClick={() => onResolve(conflict)}
                                    >
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        <span>Resolve</span>
                                    </ChamferButton>
                                </div>
                            </div>
                        </div>
                    </ChamferCard>
                );
            })}
        </div>
    );
}

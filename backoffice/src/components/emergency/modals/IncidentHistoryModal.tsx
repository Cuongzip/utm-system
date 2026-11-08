"use client";

import { useMemo } from "react";
import { Modal, ChamferButton, StatusBadge, EmptyState } from "@/components/ui";
import { Loader2, ShieldCheck } from "lucide-react";
import { formatDateTime } from "@/utils";
import { useEmergencyResolvedHistory, useDronesAll, useFlightsAll } from "@/hooks/useQueries";

export interface IncidentHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function IncidentHistoryModal({ isOpen, onClose }: IncidentHistoryModalProps) {
    const { data: historyData, isLoading: historyLoading } = useEmergencyResolvedHistory(
        10,
        isOpen
    );
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

    if (!isOpen) return null;

    const incidents = historyData?.data || [];

    const footer = (
        <ChamferButton variant="outline" size="sm" clip="xs" type="button" onClick={onClose}>
            Close
        </ChamferButton>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Incident History"
            maxWidth="600px"
            footer={footer}
        >
            <div className="flex flex-col gap-3">
                {historyLoading ? (
                    <div className="flex items-center justify-center p-8 text-slate-500 gap-2 text-xs">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        <span>Loading audit logs...</span>
                    </div>
                ) : incidents.length === 0 ? (
                    <EmptyState
                        icon={ShieldCheck}
                        title="No Incident History"
                        description="No resolved emergency incidents found in the system log."
                    />
                ) : (
                    incidents.map((item) => {
                        const itemFlight = item.flightId ? flightMap.get(item.flightId) : undefined;
                        const itemFlightLabel =
                            itemFlight?.flightNumber ||
                            (item.flightId && item.flightId.length > 12
                                ? `FLT-${item.flightId.slice(0, 8).toUpperCase()}`
                                : item.flightId);
                        const itemDroneId = item.droneId || itemFlight?.droneId;
                        const itemDroneLabel = itemDroneId
                            ? droneMap.get(itemDroneId) ||
                              (itemDroneId.length > 12
                                  ? `DRN-${itemDroneId.slice(0, 8).toUpperCase()}`
                                  : itemDroneId)
                            : "Drone";

                        return (
                            <div
                                key={item.id}
                                className="p-3.5 bg-[var(--color-surface-panel)] border border-[var(--color-border-strong)] rounded-md flex flex-col gap-2"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex flex-col gap-0.5 min-w-0">
                                        <span className="font-semibold text-sm text-[var(--color-text-primary)]">
                                            {item.message || item.emergencyType?.replace(/_/g, " ")}
                                        </span>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--color-text-muted)] font-mono">
                                            <span className="font-semibold text-[var(--color-text-secondary)]">
                                                Drone: {itemDroneLabel}
                                            </span>
                                            {itemFlightLabel && (
                                                <>
                                                    <span className="text-slate-300">•</span>
                                                    <span>Flight: {itemFlightLabel}</span>
                                                </>
                                            )}
                                            <span className="text-slate-300">•</span>
                                            <span>
                                                {formatDateTime(item.resolvedAt || item.detectedAt)}
                                            </span>
                                        </div>
                                    </div>
                                    <StatusBadge
                                        status="success"
                                        label="RESOLVED"
                                        shape="rounded"
                                        className="shrink-0"
                                    />
                                </div>

                                {item.resolutionNotes && (
                                    <div className="mt-1 p-2 bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] rounded text-xs text-[var(--color-text-secondary)] leading-relaxed">
                                        <span className="font-semibold text-[var(--color-text-primary)] block text-[11px] uppercase tracking-wider mb-0.5">
                                            Resolution Note
                                        </span>
                                        {item.resolutionNotes}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </Modal>
    );
}

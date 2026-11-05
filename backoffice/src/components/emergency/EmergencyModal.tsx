"use client";

import React from "react";
import { Modal, OutlineButton, ChamferButton, StatusBadge, EmptyState } from "@/components/ui";
import { ShieldAlert, History, TrendingUp, Sliders, Loader2, ShieldCheck } from "lucide-react";
import { formatDateTime, formatTime } from "@/utils";
import type { EmergencyIncidentVm } from "@/types";
import type { EmergencyProtocolType } from "./EmergencyProtocolsStrip";
import {
    useEmergencyResolvedHistory,
    useEmergencyProtocols,
    useEmergencyTrends,
    useEmergencyStats,
} from "@/hooks/useQueries";

export interface EmergencyModalProps {
    isOpen: boolean;
    onClose: () => void;
    activeProtocol?: EmergencyProtocolType | null;
    selectedIncident?: EmergencyIncidentVm | null;
    onConfirmAction?: (id: string, approved: boolean) => void;
}

export function EmergencyModal({
    isOpen,
    onClose,
    activeProtocol,
    selectedIncident,
    onConfirmAction,
}: EmergencyModalProps) {
    const { data: historyData, isLoading: historyLoading } = useEmergencyResolvedHistory(10);
    const { data: protocolsData, isLoading: protocolsLoading } = useEmergencyProtocols();
    const { data: trendsData, isLoading: trendsLoading } = useEmergencyTrends();
    const { data: statsData, isLoading: statsLoading } = useEmergencyStats();

    if (!isOpen || (!selectedIncident && !activeProtocol)) return null;

    let title = "";
    let icon = null;
    let maxWidth = "560px";
    let footer: React.ReactNode = (
        <OutlineButton size="sm" onClick={onClose}>
            Close
        </OutlineButton>
    );

    let content: React.ReactNode = null;

    if (selectedIncident) {
        title = "INCIDENT DETAILS";
        icon = <ShieldAlert className="w-5 h-5 text-rose-600" />;
        const isAwaiting = selectedIncident.status === "pending_confirmation";
        const isResolved = selectedIncident.status === "resolved";

        if (isAwaiting && onConfirmAction) {
            footer = (
                <div className="flex items-center justify-end gap-2 w-full">
                    <OutlineButton size="sm" onClick={onClose}>
                        Close
                    </OutlineButton>
                    <OutlineButton
                        size="sm"
                        onClick={() => {
                            onConfirmAction(selectedIncident.id, false);
                            onClose();
                        }}
                    >
                        Reject
                    </OutlineButton>
                    <ChamferButton
                        size="sm"
                        variant="dark"
                        onClick={() => {
                            onConfirmAction(selectedIncident.id, true);
                            onClose();
                        }}
                    >
                        Confirm Action
                    </ChamferButton>
                </div>
            );
        }

        content = (
            <div className="flex flex-col gap-4 text-xs font-mono">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-sm">
                            {selectedIncident.message || selectedIncident.emergencyType}
                        </span>
                        <StatusBadge
                            status={isAwaiting ? "warning" : isResolved ? "success" : "alert"}
                            label={
                                isAwaiting
                                    ? "AWAITING CONFIRMATION"
                                    : selectedIncident.status
                                      ? selectedIncident.status.toUpperCase()
                                      : "ACTIVE"
                            }
                            shape="rounded"
                        />
                    </div>
                    <span className="text-slate-500 text-[11px]">
                        Detected: {formatDateTime(selectedIncident.detectedAt) || "Unknown"}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 bg-white border border-slate-200 rounded">
                        <span className="text-slate-400 text-[10px] uppercase">Drone ID</span>
                        <div className="font-bold text-slate-900 mt-0.5">
                            {selectedIncident.droneId}
                        </div>
                    </div>
                    <div className="p-2.5 bg-white border border-slate-200 rounded">
                        <span className="text-slate-400 text-[10px] uppercase">
                            Action Required
                        </span>
                        <div className="font-bold text-rose-600 mt-0.5">
                            {selectedIncident.responseAction || "Operator Inspection"}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 bg-white border border-slate-200 rounded">
                        <span className="text-slate-400 text-[10px] uppercase">Severity</span>
                        <div className="font-bold text-slate-900 mt-0.5 uppercase">
                            {selectedIncident.severity}
                        </div>
                    </div>
                    <div className="p-2.5 bg-white border border-slate-200 rounded">
                        <span className="text-slate-400 text-[10px] uppercase">Flight ID</span>
                        <div className="font-bold text-slate-900 mt-0.5">
                            {selectedIncident.flightId || "N/A"}
                        </div>
                    </div>
                </div>

                {selectedIncident.timeline && selectedIncident.timeline.length > 0 && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded flex flex-col gap-2">
                        <span className="text-slate-400 text-[10px] uppercase">
                            Incident Timeline
                        </span>
                        <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                            {selectedIncident.timeline.map((evt, idx) => (
                                <div
                                    key={idx}
                                    className="flex justify-between items-center text-[11px] border-b border-slate-200/60 pb-1"
                                >
                                    <span className="text-slate-700">{evt.event}</span>
                                    <span className="text-slate-400 shrink-0 ml-2">
                                        {formatTime(evt.timestamp)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    } else if (activeProtocol === "history") {
        title = "INCIDENT AUDIT LOG";
        icon = <History className="w-5 h-5 text-slate-600" />;
        maxWidth = "600px";
        const incidents = historyData?.data || [];

        content = (
            <div className="flex flex-col gap-3 font-mono text-xs">
                {historyLoading ? (
                    <div className="flex items-center justify-center p-8 text-slate-500 gap-2">
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
                    incidents.map((item) => (
                        <div
                            key={item.id}
                            className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between"
                        >
                            <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-slate-800">
                                    {item.message || item.emergencyType}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                    {item.id} • {item.droneId} •{" "}
                                    {formatDateTime(item.resolvedAt || item.detectedAt) || "N/A"}
                                </span>
                            </div>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {item.resolutionNotes || "Resolved"}
                            </span>
                        </div>
                    ))
                )}
            </div>
        );
    } else if (activeProtocol === "trends") {
        title = "TREND & PATTERN ANALYSIS";
        icon = <TrendingUp className="w-5 h-5 text-slate-600" />;
        const byType = statsData?.byType || [];
        const totalIncidents = byType.reduce((acc, curr) => acc + (curr.count ?? 0), 0);

        content = (
            <div className="flex flex-col gap-4 font-mono text-xs">
                {trendsLoading || statsLoading ? (
                    <div className="flex items-center justify-center p-8 text-slate-500 gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        <span>Loading trend analytics...</span>
                    </div>
                ) : byType.length === 0 && (!trendsData || trendsData.length === 0) ? (
                    <EmptyState
                        icon={TrendingUp}
                        title="No Trend Data"
                        description="Insufficient incident data recorded to generate pattern distributions."
                    />
                ) : (
                    <div className="space-y-3">
                        {byType.map((item, idx) => {
                            const count = item.count ?? 0;
                            const typeLabel = (item.type || `Type ${idx + 1}`).replace(/_/g, " ");
                            const percentage =
                                totalIncidents > 0 ? Math.round((count / totalIncidents) * 100) : 0;
                            return (
                                <div key={item.type || idx}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-600 capitalize">
                                            {typeLabel}:
                                        </span>
                                        <span className="font-bold text-slate-900">
                                            {percentage}% ({count})
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded overflow-hidden">
                                        <div
                                            className="h-full bg-slate-600 transition-all duration-300"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    } else if (activeProtocol === "protocols") {
        title = "EMERGENCY RESPONSE PROTOCOLS";
        icon = <Sliders className="w-5 h-5 text-slate-600" />;
        const protocols = protocolsData || [];

        content = (
            <div className="flex flex-col gap-3 font-mono text-xs">
                {protocolsLoading ? (
                    <div className="flex items-center justify-center p-8 text-slate-500 gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        <span>Loading configured protocols...</span>
                    </div>
                ) : protocols.length === 0 ? (
                    <EmptyState
                        icon={Sliders}
                        title="No Protocols Configured"
                        description="No response protocols currently registered in the emergency controller."
                    />
                ) : (
                    protocols.map((protocol) => (
                        <div
                            key={protocol.id}
                            className="p-3 bg-slate-50 border border-slate-200 rounded flex justify-between items-center"
                        >
                            <div className="flex flex-col gap-0.5">
                                <div className="font-bold text-slate-800">{protocol.name}</div>
                                <div className="text-[11px] text-slate-500">
                                    {protocol.description || `Action: ${protocol.responseAction}`}
                                </div>
                            </div>
                            <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                                    protocol.isActive
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-slate-100 text-slate-500 border-slate-200"
                                }`}
                            >
                                {protocol.isActive ? "ACTIVE" : "DISABLED"}
                            </span>
                        </div>
                    ))
                )}
            </div>
        );
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            icon={icon}
            maxWidth={maxWidth}
            footer={footer}
        >
            {content}
        </Modal>
    );
}

export default EmergencyModal;

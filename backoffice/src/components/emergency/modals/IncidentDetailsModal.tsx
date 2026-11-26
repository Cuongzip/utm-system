"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Activity, AlertTriangle, ExternalLink } from "lucide-react";
import {
    Modal,
    CustomSelect,
    ChamferButton,
    StatusBadge,
    EmptyState,
    UnderlineTabs,
    TacticalCallout,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableLoading,
    type UnderlineTabItem,
} from "@/components/ui";
import { formatDateTime, formatTime } from "@/utils";
import { emergencyService } from "@/services/emergencyService";
import { QUERY_KEYS, useDronesAll, useFlightsAll, useEmergencyIncidentBlackbox } from "@/hooks";
import {
    INCIDENT_STATUS,
    CLOSED_INCIDENT_STATUSES,
    DEFAULT_INCIDENT_STATUS,
    EMERGENCY_SEVERITY,
    ROOT_CAUSES,
    ROOT_CAUSE,
    ROOT_CAUSE_LABELS,
    type EmergencyIncidentVm,
    type RootCause,
} from "@/types";

export interface IncidentDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    incident?: EmergencyIncidentVm | null;
    onConfirmAction: (id: string, approved: boolean) => void;
    onResolveIncident?: (id: string, resolutionNotes?: string) => void;
}

type ModalTab = "overview" | "blackbox" | "root_cause";

const MODAL_TABS: readonly UnderlineTabItem<ModalTab>[] = [
    { id: "overview", label: "Overview" },
    { id: "blackbox", label: "Blackbox" },
    { id: "root_cause", label: "Root Cause" },
];

const ROOT_CAUSE_OPTIONS = ROOT_CAUSES.map((cause) => ({
    value: cause,
    label: ROOT_CAUSE_LABELS[cause],
}));

interface IncidentDetailsModalBodyProps {
    incident: EmergencyIncidentVm;
    onClose: () => void;
    onConfirmAction: (id: string, approved: boolean) => void;
    onResolveIncident?: (id: string, resolutionNotes?: string) => void;
}

function IncidentDetailsModalBody({
    incident,
    onClose,
    onConfirmAction,
    onResolveIncident,
}: IncidentDetailsModalBodyProps) {
    const queryClient = useQueryClient();
    const { data: drones = [] } = useDronesAll();
    const { data: flights = [] } = useFlightsAll();

    const [activeTab, setActiveTab] = useState<ModalTab>("overview");
    const [rootCause, setRootCause] = useState<RootCause>(incident.rootCause ?? ROOT_CAUSE.UNKNOWN);
    const [rootCauseNotes, setRootCauseNotes] = useState(incident.rootCauseNotes || "");
    const [lessonsLearned, setLessonsLearned] = useState(incident.lessonsLearned || "");

    const { data: blackboxEntries = [], isLoading: blackboxLoading } = useEmergencyIncidentBlackbox(
        incident.id,
        activeTab === "blackbox" && Boolean(incident.id)
    );

    const saveRootCauseMutation = useMutation({
        mutationFn: () =>
            emergencyService.updateRootCause(incident.id, {
                rootCause,
                notes: rootCauseNotes.trim() || undefined,
                lessonsLearned: lessonsLearned.trim() || undefined,
            }),
        onSuccess: () => {
            toast.success("Post-incident root cause report saved");
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyActive });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyIncidents() });
        },
        meta: { defaultErrorMessage: "Failed to save root cause report" },
    });

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

    const isAwaiting = incident.status === INCIDENT_STATUS.PENDING_CONFIRMATION;
    const canResolve = Boolean(
        onResolveIncident && incident.status && !CLOSED_INCIDENT_STATUSES.includes(incident.status)
    );

    const selectedFlight = incident.flightId ? flightMap.get(incident.flightId) : undefined;
    const flightLabel =
        selectedFlight?.flightNumber ||
        (incident.flightId && incident.flightId.length > 12
            ? `FLT-${incident.flightId.slice(0, 8).toUpperCase()}`
            : incident.flightId);
    const effectiveDroneId = incident.droneId || selectedFlight?.droneId;
    const droneLabel = effectiveDroneId
        ? droneMap.get(effectiveDroneId) ||
          (effectiveDroneId.length > 12
              ? `DRN-${effectiveDroneId.slice(0, 8).toUpperCase()}`
              : effectiveDroneId)
        : "Unknown Drone";

    const investigationLink = (
        <Link
            href={`/dashboard/emergency/incidents/${incident.id}`}
            onClick={onClose}
            className="mr-auto inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
            <span>Full Investigation</span>
            <ExternalLink className="w-3.5 h-3.5" />
        </Link>
    );

    const footer = (
        <div className="flex items-center justify-between w-full gap-2">
            {investigationLink}
            <div className="flex items-center gap-2">
                <ChamferButton
                    variant="outline"
                    size="sm"
                    clip="xs"
                    type="button"
                    onClick={onClose}
                >
                    Close
                </ChamferButton>
                {activeTab === "root_cause" ? (
                    <ChamferButton
                        size="sm"
                        variant="dark"
                        clip="sm"
                        type="button"
                        disabled={saveRootCauseMutation.isPending}
                        onClick={() => saveRootCauseMutation.mutate()}
                    >
                        {saveRootCauseMutation.isPending ? "Saving..." : "Save Report"}
                    </ChamferButton>
                ) : isAwaiting ? (
                    <>
                        <ChamferButton
                            variant="outline"
                            size="sm"
                            clip="xs"
                            type="button"
                            onClick={() => {
                                onConfirmAction(incident.id, false);
                                onClose();
                            }}
                        >
                            Reject
                        </ChamferButton>
                        <ChamferButton
                            size="sm"
                            variant="dark"
                            clip="sm"
                            type="button"
                            onClick={() => {
                                onConfirmAction(incident.id, true);
                                onClose();
                            }}
                        >
                            Confirm Action
                        </ChamferButton>
                    </>
                ) : canResolve ? (
                    <ChamferButton
                        size="sm"
                        variant="dark"
                        clip="sm"
                        type="button"
                        onClick={() => {
                            onResolveIncident?.(incident.id);
                            onClose();
                        }}
                    >
                        Resolve Incident
                    </ChamferButton>
                ) : null}
            </div>
        </div>
    );

    const calloutTone = incident.severity === EMERGENCY_SEVERITY.WARNING ? "warning" : "critical";

    const detailRows = [
        { label: "Aircraft", value: droneLabel },
        { label: "Flight", value: flightLabel || "—" },
        {
            label: "Severity",
            value: incident.severity ? incident.severity.toUpperCase() : "CRITICAL",
        },
        { label: "Action Required", value: incident.responseAction || "Operator Inspection" },
        { label: "Detected At", value: formatDateTime(incident.detectedAt) },
        {
            label: "Current Status",
            value: isAwaiting
                ? "PENDING CONFIRMATION"
                : incident.status
                  ? incident.status.replace(/_/g, " ").toUpperCase()
                  : "ACTIVE",
        },
    ];

    return (
        <Modal isOpen onClose={onClose} title="Incident Details" maxWidth="560px" footer={footer}>
            <UnderlineTabs
                tabs={MODAL_TABS}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                ariaLabel="Incident detail tabs"
                className="-mt-1"
            />

            {activeTab === "overview" && (
                <div className="flex flex-col gap-3.5">
                    <TacticalCallout
                        tone={calloutTone}
                        icon={AlertTriangle}
                        title={
                            incident.message ||
                            incident.emergencyType?.replace(/_/g, " ").toUpperCase()
                        }
                        rightSlot={
                            <StatusBadge
                                status={incident.status ?? DEFAULT_INCIDENT_STATUS}
                                label={isAwaiting ? "AWAITING CONFIRMATION" : undefined}
                                dotShape="circle"
                            />
                        }
                    />

                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[var(--color-border-default)] border border-[var(--color-border-default)] rounded-md overflow-hidden">
                        {detailRows.map((item) => (
                            <div
                                key={item.label}
                                className="bg-[var(--color-surface-panel)] px-3.5 py-2.5 flex flex-col gap-0.5 min-w-0"
                            >
                                <dt className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                    {item.label}
                                </dt>
                                <dd className="text-xs font-mono font-semibold text-[var(--color-text-primary)] truncate">
                                    {item.value}
                                </dd>
                            </div>
                        ))}
                    </dl>

                    {incident.timeline && incident.timeline.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                                Incident Timeline
                            </span>
                            <div className="border border-[var(--color-border-default)] rounded-md divide-y divide-[var(--color-border-default)] max-h-36 overflow-y-auto bg-[var(--color-surface-panel)]">
                                {incident.timeline.map((evt, idx) => (
                                    <div
                                        key={idx}
                                        className="px-3 py-2 flex justify-between items-center text-xs gap-3"
                                    >
                                        <span className="text-[var(--color-text-primary)] font-medium truncate">
                                            {evt.event}
                                        </span>
                                        <span className="text-[var(--color-text-muted)] text-[11px] shrink-0 font-mono tabular-nums">
                                            {formatTime(evt.timestamp)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === "blackbox" && (
                <div>
                    {!blackboxLoading && blackboxEntries.length === 0 ? (
                        <EmptyState
                            icon={Activity}
                            title="No Blackbox Samples"
                            description="No high-frequency telemetry samples were captured for this incident."
                        />
                    ) : (
                        <div className="border border-[var(--color-border-default)] rounded-md overflow-hidden max-h-72 overflow-y-auto">
                            <Table fixed={false}>
                                <TableHeader className="sticky top-0 z-10">
                                    <TableRow>
                                        <TableHead className="px-3 py-2.5">TIME</TableHead>
                                        <TableHead className="px-3 py-2.5">ALT (M)</TableHead>
                                        <TableHead className="px-3 py-2.5">SPD (M/S)</TableHead>
                                        <TableHead className="px-3 py-2.5">BAT</TableHead>
                                        <TableHead className="px-3 py-2.5">EVENT / CMD</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {blackboxLoading ? (
                                        <TableLoading
                                            colSpan={5}
                                            rows={4}
                                            message="Loading blackbox recording..."
                                        />
                                    ) : (
                                        blackboxEntries.slice(0, 15).map((entry) => {
                                            const eventText =
                                                entry.commandExecuted || entry.emergencyType || "—";
                                            return (
                                                <TableRow key={entry.id}>
                                                    <TableCell
                                                        mono
                                                        muted
                                                        className="px-3 py-2 text-xs"
                                                    >
                                                        {formatTime(entry.timestamp)}
                                                    </TableCell>
                                                    <TableCell
                                                        mono
                                                        darkText
                                                        className="px-3 py-2 text-xs"
                                                    >
                                                        {entry.altitudeMsl != null
                                                            ? entry.altitudeMsl.toFixed(1)
                                                            : "—"}
                                                    </TableCell>
                                                    <TableCell
                                                        mono
                                                        darkText
                                                        className="px-3 py-2 text-xs"
                                                    >
                                                        {entry.groundSpeed != null
                                                            ? entry.groundSpeed.toFixed(1)
                                                            : "—"}
                                                    </TableCell>
                                                    <TableCell
                                                        mono
                                                        darkText
                                                        className="px-3 py-2 text-xs"
                                                    >
                                                        {entry.batteryLevel != null
                                                            ? `${Math.round(entry.batteryLevel)}%`
                                                            : "—"}
                                                    </TableCell>
                                                    <TableCell
                                                        mono
                                                        muted
                                                        truncate
                                                        tooltip={eventText}
                                                        className="px-3 py-2 text-xs"
                                                    >
                                                        {eventText}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            )}

            {activeTab === "root_cause" && (
                <div className="flex flex-col gap-3.5">
                    <div className="form-group">
                        <label className="form-label" htmlFor="rootCauseCategory">
                            Root Cause Category
                        </label>
                        <CustomSelect
                            id="rootCauseCategory"
                            value={rootCause}
                            onValueChange={(val) => setRootCause(val as RootCause)}
                            options={ROOT_CAUSE_OPTIONS}
                            placeholder="Select root cause..."
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="rootCauseNotes">
                            Investigation Notes
                        </label>
                        <textarea
                            id="rootCauseNotes"
                            rows={3}
                            value={rootCauseNotes}
                            onChange={(e) => setRootCauseNotes(e.target.value)}
                            placeholder="Summarize root cause analysis findings..."
                            className="form-input resize-none"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="lessonsLearned">
                            Lessons Learned / Corrective Actions
                        </label>
                        <textarea
                            id="lessonsLearned"
                            rows={2}
                            value={lessonsLearned}
                            onChange={(e) => setLessonsLearned(e.target.value)}
                            placeholder="Preventive actions or SOP adjustments..."
                            className="form-input resize-none"
                        />
                    </div>
                </div>
            )}
        </Modal>
    );
}

export function IncidentDetailsModal({
    isOpen,
    onClose,
    incident,
    onConfirmAction,
    onResolveIncident,
}: IncidentDetailsModalProps) {
    if (!isOpen || !incident) return null;

    return (
        <IncidentDetailsModalBody
            key={incident.id}
            incident={incident}
            onClose={onClose}
            onConfirmAction={onConfirmAction}
            onResolveIncident={onResolveIncident}
        />
    );
}

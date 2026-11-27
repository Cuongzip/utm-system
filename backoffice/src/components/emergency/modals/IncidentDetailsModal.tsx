"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
import { translateStatusLabel, useAppLocale } from "@/i18n";
import { formatDateTime, formatTime, localizeServerText } from "@/utils";
import { emergencyService } from "@/services/emergencyService";
import { QUERY_KEYS, useDronesAll, useFlightsAll, useEmergencyIncidentBlackbox } from "@/hooks";
import {
    INCIDENT_STATUS,
    CLOSED_INCIDENT_STATUSES,
    DEFAULT_INCIDENT_STATUS,
    EMERGENCY_SEVERITY,
    EMERGENCY_TYPES,
    ROOT_CAUSES,
    ROOT_CAUSE,
    type EmergencyIncidentVm,
    type EmergencyType,
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
    const t = useTranslations("emergency");
    const tCommon = useTranslations("common");
    const locale = useAppLocale();
    const queryClient = useQueryClient();
    const { data: drones = [] } = useDronesAll();
    const { data: flights = [] } = useFlightsAll();

    const modalTabs = useMemo<readonly UnderlineTabItem<ModalTab>[]>(
        () => [
            { id: "overview", label: t("modals.details.tabOverview") },
            { id: "blackbox", label: t("modals.details.tabBlackbox") },
            { id: "root_cause", label: t("modals.details.tabRootCause") },
        ],
        [t]
    );

    const rootCauseOptions = useMemo(
        () =>
            ROOT_CAUSES.map((cause) => ({
                value: cause,
                label: t(`rootCauses.${cause}`),
            })),
        [t]
    );

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
            toast.success(t("modals.details.reportSavedToast"));
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyActive });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyIncidents() });
        },
        meta: { defaultErrorMessage: t("modals.details.reportSaveFailed") },
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
        : t("activeList.unknownDrone");

    const investigationLink = (
        <Link
            href={`/dashboard/emergency/incidents/${incident.id}`}
            onClick={onClose}
            className="mr-auto inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
            <span>{t("modals.details.fullInvestigation")}</span>
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
                    {tCommon("close")}
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
                        {saveRootCauseMutation.isPending
                            ? tCommon("saving")
                            : t("modals.details.saveReport")}
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
                            {t("activeList.reject")}
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
                            {t("activeList.confirmAction")}
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
                        {t("activeList.resolveIncident")}
                    </ChamferButton>
                ) : null}
            </div>
        </div>
    );

    const calloutTone = incident.severity === EMERGENCY_SEVERITY.WARNING ? "warning" : "critical";
    const typeLabel =
        incident.emergencyType &&
        (EMERGENCY_TYPES as readonly string[]).includes(incident.emergencyType)
            ? t(`types.${incident.emergencyType as EmergencyType}`)
            : incident.emergencyType?.replace(/_/g, " ").toUpperCase();

    const detailRows = [
        { label: t("modals.confirm.aircraft"), value: droneLabel },
        { label: t("modals.confirm.flight"), value: flightLabel || "—" },
        {
            label: t("modals.details.severity"),
            value: translateStatusLabel(incident.severity ?? "critical", locale) ?? "CRITICAL",
        },
        {
            label: t("modals.details.actionRequired"),
            value: incident.responseAction || t("modals.details.operatorInspection"),
        },
        { label: t("modals.details.detectedAt"), value: formatDateTime(incident.detectedAt) },
        {
            label: t("modals.details.currentStatus"),
            value:
                translateStatusLabel(incident.status ?? "active", locale) ??
                (incident.status ? incident.status.replace(/_/g, " ").toUpperCase() : "ACTIVE"),
        },
    ];

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={t("modals.details.title")}
            maxWidth="560px"
            footer={footer}
        >
            <UnderlineTabs
                tabs={modalTabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                ariaLabel={t("modals.details.tabsAria")}
                className="-mt-1"
            />

            {activeTab === "overview" && (
                <div className="flex flex-col gap-3.5">
                    <TacticalCallout
                        tone={calloutTone}
                        icon={AlertTriangle}
                        title={
                            incident.message
                                ? localizeServerText(incident.message, locale)
                                : typeLabel
                        }
                        rightSlot={
                            <StatusBadge
                                status={incident.status ?? DEFAULT_INCIDENT_STATUS}
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
                                {t("modals.details.incidentTimeline")}
                            </span>
                            <div className="border border-[var(--color-border-default)] rounded-md divide-y divide-[var(--color-border-default)] max-h-36 overflow-y-auto bg-[var(--color-surface-panel)]">
                                {incident.timeline.map((evt, idx) => (
                                    <div
                                        key={idx}
                                        className="px-3 py-2 flex justify-between items-center text-xs gap-3"
                                    >
                                        <span className="text-[var(--color-text-primary)] font-medium truncate">
                                            {localizeServerText(evt.event, locale)}
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
                            title={t("detail.noBlackboxTitle")}
                            description={t("detail.noBlackboxDesc")}
                        />
                    ) : (
                        <div className="border border-[var(--color-border-default)] rounded-md overflow-hidden max-h-72 overflow-y-auto">
                            <Table fixed={false}>
                                <TableHeader className="sticky top-0 z-10">
                                    <TableRow>
                                        <TableHead className="px-3 py-2.5">
                                            {t("detail.colTime")}
                                        </TableHead>
                                        <TableHead className="px-3 py-2.5">
                                            {t("detail.colAlt")}
                                        </TableHead>
                                        <TableHead className="px-3 py-2.5">
                                            {t("detail.colSpdMs")}
                                        </TableHead>
                                        <TableHead className="px-3 py-2.5">
                                            {t("detail.colBat")}
                                        </TableHead>
                                        <TableHead className="px-3 py-2.5">
                                            {t("detail.colEventCmd")}
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {blackboxLoading ? (
                                        <TableLoading
                                            colSpan={5}
                                            rows={4}
                                            message={t("detail.loadingBlackbox")}
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
                            {t("detail.rootCauseLabel")}
                        </label>
                        <CustomSelect
                            id="rootCauseCategory"
                            value={rootCause}
                            onValueChange={(val) => setRootCause(val as RootCause)}
                            options={rootCauseOptions}
                            placeholder={t("detail.rootCausePlaceholder")}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="rootCauseNotes">
                            {t("detail.notesLabel")}
                        </label>
                        <textarea
                            id="rootCauseNotes"
                            rows={3}
                            value={rootCauseNotes}
                            onChange={(e) => setRootCauseNotes(e.target.value)}
                            placeholder={t("detail.notesPlaceholder")}
                            className="form-input resize-none"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="lessonsLearned">
                            {t("detail.lessonsLabel")}
                        </label>
                        <textarea
                            id="lessonsLearned"
                            rows={2}
                            value={lessonsLearned}
                            onChange={(e) => setLessonsLearned(e.target.value)}
                            placeholder={t("detail.lessonsPlaceholder")}
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

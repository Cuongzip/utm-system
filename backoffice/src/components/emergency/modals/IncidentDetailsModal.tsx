"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { Modal, ChamferButton, UnderlineTabs, type UnderlineTabItem } from "@/components/ui";
import { emergencyService } from "@/services/emergencyService";
import {
    QUERY_KEYS,
    useDronesAll,
    useEntityCodeMap,
    useFlightsAll,
    useEmergencyIncidentBlackbox,
} from "@/hooks";
import {
    INCIDENT_STATUS,
    CLOSED_INCIDENT_STATUSES,
    ROOT_CAUSE,
    type EmergencyIncidentVm,
    type RootCause,
} from "@/types";
import { IncidentOverviewTab } from "./incident-details/IncidentOverviewTab";
import { IncidentBlackboxTab } from "./incident-details/IncidentBlackboxTab";
import { IncidentRootCauseTab } from "./incident-details/IncidentRootCauseTab";

interface IncidentDetailsModalProps {
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
    const queryClient = useQueryClient();
    const { data: drones = [] } = useDronesAll();
    const { data: flights = [] } = useFlightsAll();
    const entityMap = useEntityCodeMap();

    const modalTabs = useMemo<readonly UnderlineTabItem<ModalTab>[]>(
        () => [
            { id: "overview", label: t("modals.details.tabOverview") },
            { id: "blackbox", label: t("modals.details.tabBlackbox") },
            { id: "root_cause", label: t("modals.details.tabRootCause") },
        ],
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
                <IncidentOverviewTab
                    incident={incident}
                    droneLabel={droneLabel}
                    flightLabel={flightLabel}
                    entityMap={entityMap}
                />
            )}

            {activeTab === "blackbox" && (
                <IncidentBlackboxTab
                    blackboxEntries={blackboxEntries}
                    blackboxLoading={blackboxLoading}
                    entityMap={entityMap}
                />
            )}

            {activeTab === "root_cause" && (
                <IncidentRootCauseTab
                    rootCause={rootCause}
                    onRootCauseChange={setRootCause}
                    rootCauseNotes={rootCauseNotes}
                    onRootCauseNotesChange={setRootCauseNotes}
                    lessonsLearned={lessonsLearned}
                    onLessonsLearnedChange={setLessonsLearned}
                />
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

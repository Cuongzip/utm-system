"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    ArrowLeft,
    Clock,
    Navigation,
    Gauge,
    CheckCircle2,
    AlertTriangle,
    Check,
    X,
} from "lucide-react";
import {
    PageHeader,
    ChamferCard,
    ChamferButton,
    KpiStrip,
    StatusBadge,
    EmptyState,
} from "@/components/ui";
import {
    QUERY_KEYS,
    useEmergencyIncidentDetail,
    useEmergencyIncidentBlackbox,
    useDronesAll,
    useFlightsAll,
    useEntityCodeMap,
} from "@/hooks";
import { emergencyService } from "@/services/emergencyService";
import { translateStatusLabel, useAppLocale } from "@/i18n";
import { formatDateTime, formatTime, localizeResponseAction } from "@/utils";
import {
    INCIDENT_STATUS,
    CLOSED_INCIDENT_STATUSES,
    EMERGENCY_TYPES,
    RESPONSE_ACTION,
    type EmergencyType,
} from "@/types";
import { IncidentDetailSkeleton } from "./IncidentDetailSkeleton";
import { IncidentBlackboxReplayCard } from "./IncidentBlackboxReplayCard";
import { IncidentBlackboxFramesTable } from "./IncidentBlackboxFramesTable";
import { IncidentBriefingTimelineCol } from "./IncidentBriefingTimelineCol";

interface EmergencyIncidentDetailViewProps {
    id: string;
}

export function EmergencyIncidentDetailView({ id }: EmergencyIncidentDetailViewProps) {
    const t = useTranslations("emergency");
    const locale = useAppLocale();
    const queryClient = useQueryClient();

    const { data: incident, isLoading: incidentLoading } = useEmergencyIncidentDetail(id);
    const { data: blackboxEntries = [], isLoading: blackboxLoading } = useEmergencyIncidentBlackbox(
        id,
        Boolean(id)
    );
    const { data: drones = [] } = useDronesAll();
    const { data: flights = [] } = useFlightsAll();
    const entityMap = useEntityCodeMap();

    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackIndex, setPlaybackIndex] = useState(0);

    const frameCount = blackboxEntries.length;
    const safeIndex = frameCount > 0 ? Math.min(playbackIndex, frameCount - 1) : 0;

    const confirmMutation = useMutation({
        mutationFn: (approved: boolean) => emergencyService.confirmIncident(id, { approved }),
        onSuccess: (_, approved) => {
            toast.success(approved ? t("actionConfirmedToast") : t("actionRejectedToast"));
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyIncidentDetail(id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyActive });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyPending });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyStats });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyIncidents() });
        },
        meta: { defaultErrorMessage: t("confirmFailed") },
    });

    const resolveMutation = useMutation({
        mutationFn: () => emergencyService.resolveIncident(id, {}),
        onSuccess: () => {
            toast.success(t("resolvedToast"));
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyIncidentDetail(id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyActive });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyPending });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyStats });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyIncidents() });
        },
        meta: { defaultErrorMessage: t("resolveFailed") },
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

    if (incidentLoading) {
        return <IncidentDetailSkeleton />;
    }

    if (!incident) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
                <PageHeader title={t("detail.pageTitle")}>
                    <ChamferButton
                        href="/dashboard/emergency/incidents"
                        variant="outline"
                        size="sm"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>{t("nav.incidents")}</span>
                    </ChamferButton>
                </PageHeader>
                <ChamferCard size="lg">
                    <EmptyState
                        icon={AlertTriangle}
                        title={t("detail.notFoundTitle")}
                        description={t("detail.notFoundDesc")}
                    />
                </ChamferCard>
            </div>
        );
    }

    const flight = incident.flightId ? flightMap.get(incident.flightId) : undefined;
    const flightLabel =
        flight?.flightNumber ||
        (incident.flightId && incident.flightId.length > 12
            ? `FLT-${incident.flightId.slice(0, 8).toUpperCase()}`
            : incident.flightId);
    const effectiveDroneId = incident.droneId || flight?.droneId;
    const droneLabel = effectiveDroneId
        ? droneMap.get(effectiveDroneId) ||
          (effectiveDroneId.length > 12
              ? `DRN-${effectiveDroneId.slice(0, 8).toUpperCase()}`
              : effectiveDroneId)
        : t("detail.unknown");

    const incidentCode = incident.incidentNumber || `INC-${incident.id.slice(0, 8).toUpperCase()}`;

    const isAwaiting = incident.status === INCIDENT_STATUS.PENDING_CONFIRMATION;
    const canResolve = !CLOSED_INCIDENT_STATUSES.includes(incident.status);

    const outcomeValue =
        incident.actionSuccess === true
            ? t("detail.outcomeSuccess")
            : incident.actionSuccess === false
              ? t("detail.outcomeFailed")
              : t("detail.outcomePending");

    const typeLabel =
        incident.emergencyType &&
        (EMERGENCY_TYPES as readonly string[]).includes(incident.emergencyType)
            ? t(`types.${incident.emergencyType as EmergencyType}`)
            : incident.emergencyType.replace(/_/g, " ");

    return (
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 w-full">
            <PageHeader
                title={incidentCode}
                badges={
                    <div className="flex items-center gap-2">
                        <StatusBadge status={incident.severity} />
                        <StatusBadge status={incident.status} />
                    </div>
                }
            >
                <ChamferButton href="/dashboard/emergency/incidents" variant="outline" size="sm">
                    <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t("nav.incidents")}</span>
                </ChamferButton>

                {isAwaiting && (
                    <>
                        <ChamferButton
                            variant="outline"
                            size="sm"
                            disabled={confirmMutation.isPending}
                            onClick={() => confirmMutation.mutate(false)}
                        >
                            <X className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{t("activeList.reject")}</span>
                        </ChamferButton>
                        <ChamferButton
                            variant="dark"
                            size="sm"
                            disabled={confirmMutation.isPending}
                            onClick={() => confirmMutation.mutate(true)}
                        >
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{t("activeList.confirmAction")}</span>
                        </ChamferButton>
                    </>
                )}

                {!isAwaiting && canResolve && (
                    <ChamferButton
                        variant="dark"
                        size="sm"
                        disabled={resolveMutation.isPending}
                        onClick={() => resolveMutation.mutate()}
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t("activeList.resolveIncident")}</span>
                    </ChamferButton>
                )}
            </PageHeader>

            <KpiStrip
                items={[
                    {
                        id: "detected",
                        label: t("detail.kpiDetectedAt"),
                        value: formatTime(incident.detectedAt),
                        subValue: formatDateTime(incident.detectedAt),
                        icon: Clock,
                    },
                    {
                        id: "aircraft",
                        label: t("detail.kpiAircraft"),
                        value: droneLabel,
                        subValue: flightLabel
                            ? t("detail.flightSub", { flight: flightLabel })
                            : t("detail.unassigned"),
                        icon: Navigation,
                    },
                    {
                        id: "action",
                        label: t("detail.kpiResponseAction"),
                        value:
                            incident.responseAction &&
                            incident.responseAction !== RESPONSE_ACTION.NONE
                                ? localizeResponseAction(incident.responseAction, locale, true)
                                : t("detail.noneAction"),
                        subValue: incident.wasAutoExecuted
                            ? t("detail.autoExecuted")
                            : t("detail.supervised"),
                        icon: Gauge,
                    },
                    {
                        id: "outcome",
                        label: t("detail.kpiOutcome"),
                        value: outcomeValue,
                        subValue:
                            translateStatusLabel(incident.status, locale) ??
                            incident.status.replace(/_/g, " ").toUpperCase(),
                        icon: incident.actionSuccess ? CheckCircle2 : AlertTriangle,
                    },
                ]}
            />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full">
                <div className="xl:col-span-7 flex flex-col gap-6">
                    <IncidentBlackboxReplayCard
                        incident={incident}
                        incidentCode={incidentCode}
                        blackboxEntries={blackboxEntries}
                        safeIndex={safeIndex}
                        isPlaying={isPlaying}
                        setIsPlaying={setIsPlaying}
                        setPlaybackIndex={setPlaybackIndex}
                    />

                    <IncidentBlackboxFramesTable
                        blackboxEntries={blackboxEntries}
                        blackboxLoading={blackboxLoading}
                        safeIndex={safeIndex}
                        entityMap={entityMap}
                        onSelectFrame={(idx) => {
                            setIsPlaying(false);
                            setPlaybackIndex(idx);
                        }}
                    />
                </div>

                <IncidentBriefingTimelineCol
                    incident={incident}
                    typeLabel={typeLabel}
                    entityMap={entityMap}
                />
            </div>
        </div>
    );
}

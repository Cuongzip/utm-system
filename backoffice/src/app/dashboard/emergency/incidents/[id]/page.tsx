"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    ArrowLeft,
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Clock,
    Navigation,
    Gauge,
    Battery,
    Wifi,
    MapPin,
    CheckCircle2,
    AlertTriangle,
    FileText,
    Save,
    Activity,
    Check,
    X,
} from "lucide-react";
import {
    PageHeader,
    ChamferCard,
    ChamferButton,
    KpiStrip,
    StatusBadge,
    CustomSelect,
    EmptyState,
    Skeleton,
    TacticalCallout,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableLoading,
} from "@/components/ui";
import { TacticalMapContainer, IncidentReplayLayer } from "@/components/map";
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
import {
    formatDateTime,
    formatTime,
    formatCoordinates,
    formatAltitude,
    formatSpeed,
    formatTimelineEntryData,
    localizeResponseAction,
    localizeServerText,
} from "@/utils";
import {
    INCIDENT_STATUS,
    CLOSED_INCIDENT_STATUSES,
    EMERGENCY_TYPES,
    ROOT_CAUSES,
    ROOT_CAUSE,
    RESPONSE_ACTION,
    type EmergencyIncidentVm,
    type EmergencyType,
    type RootCause,
} from "@/types";

const PLAYBACK_SPEED_OPTIONS = [
    { value: "0.5", label: "0.5x" },
    { value: "1", label: "1x" },
    { value: "2", label: "2x" },
    { value: "4", label: "4x" },
];

interface RootCauseFormProps {
    incident: EmergencyIncidentVm;
}

function RootCauseInvestigationCard({ incident }: RootCauseFormProps) {
    const t = useTranslations("emergency");
    const tCommon = useTranslations("common");
    const queryClient = useQueryClient();
    const [rootCause, setRootCause] = useState<RootCause>(incident.rootCause ?? ROOT_CAUSE.UNKNOWN);
    const [notes, setNotes] = useState(incident.rootCauseNotes ?? "");
    const [lessonsLearned, setLessonsLearned] = useState(incident.lessonsLearned ?? "");

    const rootCauseOptions = useMemo(
        () =>
            ROOT_CAUSES.map((cause) => ({
                value: cause,
                label: t(`rootCauses.${cause}`),
            })),
        [t]
    );

    const saveMutation = useMutation({
        mutationFn: () =>
            emergencyService.updateRootCause(incident.id, {
                rootCause,
                notes: notes.trim() || undefined,
                lessonsLearned: lessonsLearned.trim() || undefined,
            }),
        onSuccess: () => {
            toast.success(t("detail.investigationSavedToast"));
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.emergencyIncidentDetail(incident.id),
            });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyActive });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyIncidents() });
        },
        meta: { defaultErrorMessage: t("detail.investigationSaveFailed") },
    });

    return (
        <ChamferCard size="lg" className="w-full">
            <div className="p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2.5">
                    <FileText className="w-4 h-4 text-slate-600" />
                    <span>{t("detail.investigationHeading")}</span>
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="detail-root-cause">
                        {t("detail.rootCauseLabel")}
                    </label>
                    <CustomSelect
                        id="detail-root-cause"
                        value={rootCause}
                        onValueChange={(val) => setRootCause(val as RootCause)}
                        options={rootCauseOptions}
                        placeholder={t("detail.rootCausePlaceholder")}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="detail-root-cause-notes">
                        {t("detail.notesLabel")}
                    </label>
                    <textarea
                        id="detail-root-cause-notes"
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={t("detail.notesPlaceholder")}
                        className="form-input resize-none"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="detail-lessons-learned">
                        {t("detail.lessonsLabel")}
                    </label>
                    <textarea
                        id="detail-lessons-learned"
                        rows={3}
                        value={lessonsLearned}
                        onChange={(e) => setLessonsLearned(e.target.value)}
                        placeholder={t("detail.lessonsPlaceholder")}
                        className="form-input resize-none"
                    />
                </div>

                <div className="flex justify-end pt-1">
                    <ChamferButton
                        variant="dark"
                        size="sm"
                        disabled={saveMutation.isPending}
                        onClick={() => saveMutation.mutate()}
                    >
                        <Save className="w-3.5 h-3.5" />
                        <span>
                            {saveMutation.isPending
                                ? tCommon("saving")
                                : t("detail.saveInvestigation")}
                        </span>
                    </ChamferButton>
                </div>
            </div>
        </ChamferCard>
    );
}

interface IncidentDetailPageProps {
    params: Promise<{ id: string }>;
}

export default function EmergencyIncidentDetailPage({ params }: IncidentDetailPageProps) {
    const { id } = use(params);
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
    const [playbackSpeed, setPlaybackSpeed] = useState(1);

    const frameCount = blackboxEntries.length;
    const safeIndex = frameCount > 0 ? Math.min(playbackIndex, frameCount - 1) : 0;

    useEffect(() => {
        if (!isPlaying || frameCount <= 1) return;
        const intervalMs = Math.max(150, Math.round(1000 / playbackSpeed));
        const timer = setInterval(() => {
            setPlaybackIndex((prev) => {
                if (prev >= frameCount - 1) {
                    setIsPlaying(false);
                    return prev;
                }
                return prev + 1;
            });
        }, intervalMs);
        return () => clearInterval(timer);
    }, [isPlaying, playbackSpeed, frameCount]);

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
        return (
            <div
                role="status"
                aria-busy="true"
                aria-label={t("detail.loadingAria")}
                className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 w-full"
            >
                <div className="flex items-center justify-between gap-4">
                    <Skeleton className="h-7 w-64" />
                    <Skeleton className="h-9 w-36" />
                </div>
                <KpiStrip
                    loading
                    items={[
                        { id: "detected", label: t("detail.kpiDetectedAt"), value: "—" },
                        { id: "aircraft", label: t("detail.kpiAircraft"), value: "—" },
                        { id: "action", label: t("detail.kpiResponseAction"), value: "—" },
                        { id: "outcome", label: t("detail.kpiOutcome"), value: "—" },
                    ]}
                />
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-7">
                        <ChamferCard size="lg">
                            <div className="p-5 flex flex-col gap-4">
                                <Skeleton className="h-5 w-48" />
                                <Skeleton className="h-[360px] w-full" />
                            </div>
                        </ChamferCard>
                    </div>
                    <div className="lg:col-span-5">
                        <ChamferCard size="lg">
                            <div className="p-5 flex flex-col gap-3">
                                <Skeleton className="h-5 w-36" />
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-24 w-full" />
                            </div>
                        </ChamferCard>
                    </div>
                </div>
                <span className="sr-only">{t("detail.loadingAria")}</span>
            </div>
        );
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
    const currentFrame = blackboxEntries[safeIndex] ?? null;

    const hasCoordinates =
        (typeof incident.latitude === "number" && typeof incident.longitude === "number") ||
        blackboxEntries.some(
            (e) => typeof e.latitude === "number" && typeof e.longitude === "number"
        );

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
                        <StatusBadge status={incident.severity} dotShape="circle" />
                        <StatusBadge status={incident.status} dotShape="circle" />
                    </div>
                }
            >
                <ChamferButton href="/dashboard/emergency/incidents" variant="outline" size="sm">
                    <ArrowLeft className="w-3.5 h-3.5" />
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
                            <X className="w-3.5 h-3.5" />
                            <span>{t("activeList.reject")}</span>
                        </ChamferButton>
                        <ChamferButton
                            variant="dark"
                            size="sm"
                            disabled={confirmMutation.isPending}
                            onClick={() => confirmMutation.mutate(true)}
                        >
                            <Check className="w-3.5 h-3.5" />
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
                        <CheckCircle2 className="w-3.5 h-3.5" />
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
                        iconClassName:
                            incident.actionSuccess === true
                                ? "text-emerald-600"
                                : incident.actionSuccess === false
                                  ? "text-red-600"
                                  : "text-amber-500",
                    },
                ]}
            />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full">
                <div className="xl:col-span-7 flex flex-col gap-6">
                    <ChamferCard size="lg" className="w-full">
                        <div className="p-5 flex flex-col gap-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                                    <MapPin className="w-4 h-4 text-slate-600" />
                                    <span>{t("detail.replayHeading")}</span>
                                </div>
                                {frameCount > 0 && (
                                    <span className="text-xs font-mono text-slate-500 tabular-nums">
                                        {t("detail.frameProgress", {
                                            current: safeIndex + 1,
                                            total: frameCount,
                                        })}
                                    </span>
                                )}
                            </div>

                            {hasCoordinates ? (
                                <div className="h-[420px] w-full">
                                    <TacticalMapContainer initialLayerType="satellite-hybrid">
                                        <IncidentReplayLayer
                                            incidentLat={incident.latitude}
                                            incidentLng={incident.longitude}
                                            incidentAlt={incident.altitude}
                                            incidentLabel={incidentCode}
                                            blackboxEntries={blackboxEntries}
                                            playbackIndex={safeIndex}
                                        />
                                    </TacticalMapContainer>
                                </div>
                            ) : (
                                <EmptyState
                                    compact
                                    icon={MapPin}
                                    title={t("detail.noCoordsTitle")}
                                    description={t("detail.noCoordsDesc")}
                                />
                            )}

                            {frameCount > 0 && (
                                <div className="flex flex-col gap-3 pt-1">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range"
                                            min={0}
                                            max={Math.max(0, frameCount - 1)}
                                            value={safeIndex}
                                            onChange={(e) => {
                                                setIsPlaying(false);
                                                setPlaybackIndex(Number(e.target.value));
                                            }}
                                            aria-label={t("detail.timelineAria")}
                                            className="flex-1 accent-slate-800 cursor-pointer"
                                        />
                                        <span className="text-xs font-mono text-slate-600 tabular-nums shrink-0">
                                            {currentFrame
                                                ? formatTime(currentFrame.timestamp)
                                                : "—"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <ChamferButton
                                                variant="outline"
                                                size="xs"
                                                onClick={() => {
                                                    setIsPlaying(false);
                                                    setPlaybackIndex(0);
                                                }}
                                                title={t("detail.jumpStart")}
                                                aria-label={t("detail.jumpStart")}
                                            >
                                                <SkipBack className="w-3.5 h-3.5" />
                                            </ChamferButton>
                                            <ChamferButton
                                                variant="dark"
                                                size="xs"
                                                onClick={() => {
                                                    if (safeIndex >= frameCount - 1) {
                                                        setPlaybackIndex(0);
                                                    }
                                                    setIsPlaying((prev) => !prev);
                                                }}
                                            >
                                                {isPlaying ? (
                                                    <>
                                                        <Pause className="w-3.5 h-3.5" />
                                                        <span>{t("detail.pause")}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Play className="w-3.5 h-3.5" />
                                                        <span>{t("detail.replay")}</span>
                                                    </>
                                                )}
                                            </ChamferButton>
                                            <ChamferButton
                                                variant="outline"
                                                size="xs"
                                                onClick={() => {
                                                    setIsPlaying(false);
                                                    setPlaybackIndex(Math.max(0, frameCount - 1));
                                                }}
                                                title={t("detail.jumpEnd")}
                                                aria-label={t("detail.jumpEnd")}
                                            >
                                                <SkipForward className="w-3.5 h-3.5" />
                                            </ChamferButton>
                                        </div>

                                        <div className="w-24">
                                            <CustomSelect
                                                id="replay-speed"
                                                value={String(playbackSpeed)}
                                                onValueChange={(v) => setPlaybackSpeed(Number(v))}
                                                options={PLAYBACK_SPEED_OPTIONS}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ChamferCard>

                    {currentFrame && (
                        <KpiStrip
                            items={[
                                {
                                    id: "frame-battery",
                                    label: t("detail.frameBattery"),
                                    value:
                                        currentFrame.batteryLevel != null
                                            ? `${Math.round(currentFrame.batteryLevel)}%`
                                            : "—",
                                    icon: Battery,
                                    iconClassName:
                                        (currentFrame.batteryLevel ?? 100) < 20
                                            ? "text-red-600"
                                            : undefined,
                                },
                                {
                                    id: "frame-signal",
                                    label: t("detail.frameSignal"),
                                    value:
                                        currentFrame.signalStrength != null
                                            ? `${Math.round(currentFrame.signalStrength)}%`
                                            : "—",
                                    icon: Wifi,
                                    iconClassName:
                                        (currentFrame.signalStrength ?? 100) < 30
                                            ? "text-red-600"
                                            : undefined,
                                },
                                {
                                    id: "frame-altitude",
                                    label: t("detail.frameAltitude"),
                                    value:
                                        currentFrame.altitudeMsl != null
                                            ? `${Math.round(currentFrame.altitudeMsl)}m`
                                            : "—",
                                    icon: Navigation,
                                },
                                {
                                    id: "frame-speed",
                                    label: t("detail.frameSpeed"),
                                    value: formatSpeed(currentFrame.groundSpeed),
                                    icon: Gauge,
                                },
                            ]}
                        />
                    )}

                    <ChamferCard size="lg" className="w-full">
                        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                                <Activity className="w-4 h-4 text-slate-600" />
                                <span>{t("detail.blackboxHeading")}</span>
                            </div>
                            <span className="text-xs font-mono text-slate-400">
                                {frameCount === 1
                                    ? t("detail.frameSingle")
                                    : t("detail.framePlural", { count: frameCount })}
                            </span>
                        </div>
                        {!blackboxLoading && frameCount === 0 ? (
                            <EmptyState
                                compact
                                icon={Activity}
                                title={t("detail.noBlackboxTitle")}
                                description={t("detail.noBlackboxDesc")}
                            />
                        ) : (
                            <div className="max-h-72 overflow-y-auto">
                                <Table fixed={false}>
                                    <TableHeader className="sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead>{t("detail.colFrame")}</TableHead>
                                            <TableHead>{t("detail.colTime")}</TableHead>
                                            <TableHead>{t("detail.colAlt")}</TableHead>
                                            <TableHead>{t("detail.colSpd")}</TableHead>
                                            <TableHead>{t("detail.colBat")}</TableHead>
                                            <TableHead>{t("detail.colEventCmd")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {blackboxLoading ? (
                                            <TableLoading
                                                colSpan={6}
                                                rows={4}
                                                message={t("detail.loadingBlackbox")}
                                            />
                                        ) : (
                                            blackboxEntries.slice(0, 50).map((entry, idx) => {
                                                const eventText = entry.commandExecuted
                                                    ? localizeResponseAction(
                                                          entry.commandExecuted,
                                                          locale,
                                                          true
                                                      )
                                                    : entry.emergencyType &&
                                                        (
                                                            EMERGENCY_TYPES as readonly string[]
                                                        ).includes(entry.emergencyType)
                                                      ? t(
                                                            `types.${entry.emergencyType as EmergencyType}`
                                                        )
                                                      : entry.emergencyType
                                                        ? localizeServerText(
                                                              entry.emergencyType,
                                                              locale,
                                                              { entityMap }
                                                          )
                                                        : "—";
                                                const isActiveFrame = idx === safeIndex;
                                                return (
                                                    <TableRow
                                                        key={entry.id}
                                                        onClick={() => {
                                                            setIsPlaying(false);
                                                            setPlaybackIndex(idx);
                                                        }}
                                                        className={`cursor-pointer ${
                                                            isActiveFrame ? "bg-slate-100" : ""
                                                        }`}
                                                    >
                                                        <TableCell mono bold darkText>
                                                            #{idx + 1}
                                                        </TableCell>
                                                        <TableCell mono muted>
                                                            {formatTime(entry.timestamp)}
                                                        </TableCell>
                                                        <TableCell mono darkText>
                                                            {entry.altitudeMsl != null
                                                                ? entry.altitudeMsl.toFixed(1)
                                                                : "—"}
                                                        </TableCell>
                                                        <TableCell mono darkText>
                                                            {formatSpeed(entry.groundSpeed)}
                                                        </TableCell>
                                                        <TableCell mono darkText>
                                                            {entry.batteryLevel != null
                                                                ? `${Math.round(entry.batteryLevel)}%`
                                                                : "—"}
                                                        </TableCell>
                                                        <TableCell
                                                            mono
                                                            muted
                                                            truncate
                                                            tooltip={eventText}
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
                    </ChamferCard>
                </div>

                <div className="xl:col-span-5 flex flex-col gap-6">
                    <ChamferCard size="lg" className="w-full">
                        <div className="p-5 flex flex-col gap-3.5">
                            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2.5">
                                <AlertTriangle className="w-4 h-4 text-slate-600" />
                                <span>{t("detail.briefingHeading")}</span>
                            </div>

                            <p className="text-sm font-semibold text-slate-900 leading-snug">
                                {incident.message
                                    ? localizeServerText(incident.message, locale, { entityMap })
                                    : typeLabel}
                            </p>

                            <dl className="grid grid-cols-2 gap-px bg-[var(--color-border-default)] border border-[var(--color-border-default)] rounded-md overflow-hidden text-xs font-mono">
                                <div className="bg-[var(--color-surface-panel)] p-3">
                                    <dt className="text-[10px] uppercase text-[var(--color-text-muted)]">
                                        {t("detail.emergencyType")}
                                    </dt>
                                    <dd className="font-semibold text-[var(--color-text-primary)] mt-0.5">
                                        {typeLabel}
                                    </dd>
                                </div>
                                <div className="bg-[var(--color-surface-panel)] p-3">
                                    <dt className="text-[10px] uppercase text-[var(--color-text-muted)]">
                                        {t("detail.coordinates")}
                                    </dt>
                                    <dd className="font-semibold text-[var(--color-text-primary)] mt-0.5">
                                        {formatCoordinates({
                                            latitude: incident.latitude,
                                            longitude: incident.longitude,
                                        })}
                                    </dd>
                                </div>
                                <div className="bg-[var(--color-surface-panel)] p-3">
                                    <dt className="text-[10px] uppercase text-[var(--color-text-muted)]">
                                        {t("detail.altitudeMsl")}
                                    </dt>
                                    <dd className="font-semibold text-[var(--color-text-primary)] mt-0.5">
                                        {formatAltitude(incident.altitude)}
                                    </dd>
                                </div>
                                <div className="bg-[var(--color-surface-panel)] p-3">
                                    <dt className="text-[10px] uppercase text-[var(--color-text-muted)]">
                                        {t("detail.resolvedAt")}
                                    </dt>
                                    <dd className="font-semibold text-[var(--color-text-primary)] mt-0.5">
                                        {incident.resolvedAt
                                            ? formatDateTime(incident.resolvedAt)
                                            : "—"}
                                    </dd>
                                </div>
                            </dl>

                            {incident.resolutionNotes && (
                                <TacticalCallout
                                    tone="info"
                                    title={t("detail.resolutionNotes")}
                                    description={localizeServerText(
                                        incident.resolutionNotes,
                                        locale,
                                        { entityMap }
                                    )}
                                />
                            )}
                        </div>
                    </ChamferCard>

                    <ChamferCard size="lg" className="w-full">
                        <div className="p-5 flex flex-col gap-4">
                            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2.5">
                                <Clock className="w-4 h-4 text-slate-600" />
                                <span>{t("detail.timelineHeading")}</span>
                            </div>

                            {!incident.timeline || incident.timeline.length === 0 ? (
                                <p className="text-xs font-mono text-slate-400 py-2">
                                    {t("detail.noTimeline")}
                                </p>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {incident.timeline.map((evt, idx) => {
                                        const metaText = formatTimelineEntryData(evt.data, locale, {
                                            entityMap,
                                        });
                                        return (
                                            <div key={idx} className="flex gap-3">
                                                <div className="flex flex-col items-center pt-1">
                                                    <div className="w-2 h-2 rounded-full bg-slate-800 shrink-0" />
                                                    {idx < (incident.timeline?.length ?? 0) - 1 && (
                                                        <div className="w-px flex-1 bg-slate-200 mt-1" />
                                                    )}
                                                </div>
                                                <div className="flex-1 pb-2 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs font-semibold text-slate-900">
                                                            {evt.event
                                                                ? localizeServerText(
                                                                      evt.event,
                                                                      locale,
                                                                      { entityMap }
                                                                  )
                                                                : t("detail.eventFallback")}
                                                        </span>
                                                        <span className="text-[11px] font-mono text-slate-400 shrink-0 tabular-nums">
                                                            {formatTime(evt.timestamp)}
                                                        </span>
                                                    </div>
                                                    {metaText && (
                                                        <p className="text-[11px] font-mono text-slate-500 mt-0.5 break-words">
                                                            {metaText}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </ChamferCard>

                    <RootCauseInvestigationCard
                        key={`${incident.id}-${incident.lastModifiedOn ?? ""}`}
                        incident={incident}
                    />
                </div>
            </div>
        </div>
    );
}

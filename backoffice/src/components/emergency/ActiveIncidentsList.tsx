"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, ShieldCheck, Check, X, Clock } from "lucide-react";
import { ChamferCard, ChamferButton, StatusBadge, EmptyState } from "@/components/ui";
import { useAppLocale } from "@/i18n";
import {
    formatDuration,
    formatRelativeTime,
    localizeResponseAction,
    localizeServerText,
} from "@/utils";
import { useDronesAll, useEntityCodeMap, useFlightsAll } from "@/hooks";
import {
    INCIDENT_STATUS,
    EMERGENCY_TYPES,
    RESPONSE_ACTION,
    type EmergencyIncidentVm,
    type EmergencyType,
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
    const t = useTranslations("emergency");
    const tCommon = useTranslations("common");
    const locale = useAppLocale();
    const { data: drones = [] } = useDronesAll();
    const { data: flights = [] } = useFlightsAll();
    const entityMap = useEntityCodeMap();
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

    const getTypeLabel = (rawType?: string) => {
        if (!rawType) return "";
        if ((EMERGENCY_TYPES as readonly string[]).includes(rawType)) {
            return t(`types.${rawType as EmergencyType}`);
        }
        return rawType.replace(/_/g, " ");
    };

    return (
        <ChamferCard size="lg" className="w-full">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2">
                <h2 className="text-xs font-bold font-mono tracking-wider text-slate-900 uppercase">
                    {t("activeList.heading", { count: incidents.length })}
                </h2>
                <StatusBadge
                    status={incidents.length > 0 ? "critical" : "nominal"}
                    label={
                        incidents.length > 0
                            ? t("activeList.activeBadge", { count: incidents.length })
                            : undefined
                    }
                />
            </div>

            {incidents.length === 0 ? (
                <EmptyState
                    icon={ShieldCheck}
                    title={t("activeList.emptyTitle")}
                    description={t("activeList.emptyDesc")}
                />
            ) : (
                <div className="divide-y divide-slate-200">
                    {incidents.map((incident) => {
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
                            : t("activeList.unknownDrone");

                        const typeTitle =
                            getTypeLabel(incident.emergencyType) ||
                            incident.incidentNumber ||
                            droneRegText;
                        const detailMessage = incident.message
                            ? localizeServerText(incident.message, locale, { entityMap })
                            : "";

                        return (
                            <div
                                key={incident.id}
                                className="group px-4 py-3.5 hover:bg-slate-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                            >
                                <button
                                    type="button"
                                    onClick={() => onSelectIncident(incident)}
                                    className="flex flex-col min-w-0 flex-1 text-left cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                >
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                                        <span className="font-mono text-xs font-bold uppercase tracking-wide text-slate-900">
                                            {typeTitle}
                                        </span>
                                        <StatusBadge status={incident.severity} />
                                        <span className="text-slate-300 select-none">·</span>
                                        <span className="font-mono text-xs font-semibold text-slate-700">
                                            {droneRegText}
                                        </span>
                                        {flightNumText && (
                                            <>
                                                <span className="text-slate-300 select-none">
                                                    ·
                                                </span>
                                                <span className="font-mono text-xs text-slate-500">
                                                    {flightNumText}
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {detailMessage && (
                                        <p className="mt-1 text-xs text-slate-600 truncate">
                                            {detailMessage}
                                        </p>
                                    )}
                                </button>

                                <div className="flex items-center flex-wrap gap-2.5 self-end sm:self-center shrink-0">
                                    {incident.responseAction &&
                                        incident.responseAction !== RESPONSE_ACTION.NONE && (
                                            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider rounded bg-slate-100 text-slate-700 border border-slate-200">
                                                {localizeResponseAction(
                                                    incident.responseAction,
                                                    locale,
                                                    true
                                                )}
                                            </span>
                                        )}

                                    {secondsLeft !== null && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-slate-100 text-slate-800 border border-slate-300 tabular-nums">
                                            <Clock
                                                className="w-3 h-3 text-slate-600"
                                                aria-hidden="true"
                                            />
                                            <span>{formatDuration(secondsLeft)}</span>
                                        </span>
                                    )}

                                    {isAwaiting ? (
                                        <div className="flex items-center gap-1.5">
                                            <ChamferButton
                                                size="xs"
                                                variant="dark"
                                                onClick={() => onConfirmAction(incident.id, true)}
                                                title={t("activeList.approveTitle")}
                                            >
                                                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                                <span>{tCommon("confirm")}</span>
                                            </ChamferButton>
                                            <ChamferButton
                                                size="xs"
                                                variant="outline"
                                                onClick={() => onConfirmAction(incident.id, false)}
                                                title={t("activeList.rejectTitle")}
                                            >
                                                <X className="w-3.5 h-3.5" aria-hidden="true" />
                                                <span>{t("activeList.reject")}</span>
                                            </ChamferButton>
                                        </div>
                                    ) : (
                                        <span className="text-[11px] font-mono text-slate-400 tabular-nums whitespace-nowrap">
                                            {formatRelativeTime(incident.detectedAt)}
                                        </span>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => onSelectIncident(incident)}
                                        aria-label={typeTitle}
                                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                    >
                                        <ChevronRight className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </ChamferCard>
    );
}

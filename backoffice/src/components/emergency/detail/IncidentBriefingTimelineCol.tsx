"use client";

import { useTranslations } from "next-intl";
import { ChamferCard, TacticalCallout } from "@/components/ui";
import { useAppLocale } from "@/i18n";
import {
    formatCoordinates,
    formatAltitude,
    formatDateTime,
    formatTime,
    formatTimelineEntryData,
    localizeServerText,
} from "@/utils";
import type { EmergencyIncidentVm } from "@/types";
import { RootCauseInvestigationCard } from "./RootCauseInvestigationCard";

interface IncidentBriefingTimelineColProps {
    incident: EmergencyIncidentVm;
    typeLabel: string;
    entityMap: ReadonlyMap<string, string>;
}

export function IncidentBriefingTimelineCol({
    incident,
    typeLabel,
    entityMap,
}: IncidentBriefingTimelineColProps) {
    const t = useTranslations("emergency");
    const locale = useAppLocale();

    return (
        <div className="xl:col-span-5 flex flex-col gap-6">
            <ChamferCard size="lg" className="w-full">
                <div className="p-5 flex flex-col gap-3.5">
                    <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2.5">
                        {t("detail.briefingHeading")}
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
                                {incident.resolvedAt ? formatDateTime(incident.resolvedAt) : "—"}
                            </dd>
                        </div>
                    </dl>

                    {incident.resolutionNotes && (
                        <TacticalCallout
                            tone="info"
                            title={t("detail.resolutionNotes")}
                            description={localizeServerText(incident.resolutionNotes, locale, {
                                entityMap,
                            })}
                        />
                    )}
                </div>
            </ChamferCard>

            <ChamferCard size="lg" className="w-full">
                <div className="p-5 flex flex-col gap-4">
                    <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2.5">
                        {t("detail.timelineHeading")}
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
                                                        ? localizeServerText(evt.event, locale, {
                                                              entityMap,
                                                          })
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
    );
}

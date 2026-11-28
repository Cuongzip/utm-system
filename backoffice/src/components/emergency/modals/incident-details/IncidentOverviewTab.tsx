"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { StatusBadge, TacticalCallout } from "@/components/ui";
import { translateStatusLabel, useAppLocale } from "@/i18n";
import {
    formatDateTime,
    formatTime,
    formatTimelineEntryData,
    localizeResponseAction,
    localizeServerText,
} from "@/utils";
import {
    DEFAULT_INCIDENT_STATUS,
    EMERGENCY_SEVERITY,
    EMERGENCY_TYPES,
    type EmergencyIncidentVm,
    type EmergencyType,
} from "@/types";

interface IncidentOverviewTabProps {
    incident: EmergencyIncidentVm;
    droneLabel: string;
    flightLabel?: string;
    entityMap: ReadonlyMap<string, string>;
}

export function IncidentOverviewTab({
    incident,
    droneLabel,
    flightLabel,
    entityMap,
}: IncidentOverviewTabProps) {
    const t = useTranslations("emergency");
    const locale = useAppLocale();

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
            value: incident.responseAction
                ? localizeResponseAction(incident.responseAction, locale, true)
                : t("modals.details.operatorInspection"),
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
        <div className="flex flex-col gap-3.5">
            <TacticalCallout
                tone={calloutTone}
                icon={AlertTriangle}
                title={
                    incident.message
                        ? localizeServerText(incident.message, locale, { entityMap })
                        : typeLabel
                }
                description={
                    incident.resolutionNotes
                        ? localizeServerText(incident.resolutionNotes, locale, {
                              entityMap,
                          })
                        : undefined
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
                        {incident.timeline.map((evt, idx) => {
                            const metaText = formatTimelineEntryData(evt.data, locale, {
                                entityMap,
                            });
                            return (
                                <div key={idx} className="px-3 py-2 flex flex-col gap-0.5 text-xs">
                                    <div className="flex justify-between items-center gap-3">
                                        <span className="text-[var(--color-text-primary)] font-medium truncate">
                                            {localizeServerText(evt.event, locale, {
                                                entityMap,
                                            })}
                                        </span>
                                        <span className="text-[var(--color-text-muted)] text-[11px] shrink-0 font-mono tabular-nums">
                                            {formatTime(evt.timestamp)}
                                        </span>
                                    </div>
                                    {metaText && (
                                        <span className="text-[11px] font-mono text-[var(--color-text-muted)] truncate">
                                            {metaText}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

"use client";

import { useLocale, useTranslations } from "next-intl";
import { AlertOctagon, ArrowUpRight, ShieldCheck, Siren } from "lucide-react";
import { EmptyState, StatusBadge } from "@/components/ui";
import { summarizeCommandParams } from "../routeProgressUtils";
import type { AppLocale } from "@/i18n";
import { cn } from "@/lib";
import {
    formatDateTime,
    formatTime,
    localizeAlertTypeTitle,
    localizeResponseAction,
} from "@/utils";
import {
    DEFAULT_COMMAND_STATUS,
    EMERGENCY_TYPES,
    RESPONSE_ACTION,
    type Conflict,
    type DroneCommand,
    type EmergencyIncidentVm,
    type EmergencyType,
} from "@/types";
import type { ReplayEventWindowStatus } from "./useFlightReplayDossierData";

interface ReplayAuditTabProps {
    sortedCommands: DroneCommand[];
    recordedIncidents: EmergencyIncidentVm[];
    recordedConflicts: Conflict[];
    hubCodeMap: Map<string, string>;
    totalFrames: number;
    seekToTimestamp: (targetIsoOrMs?: string | number | null) => void;
    getEventWindowStatus: (iso?: string | null) => ReplayEventWindowStatus;
    humanizeAuditText: (raw: string) => string;
}

export function ReplayAuditTab({
    sortedCommands,
    recordedIncidents,
    recordedConflicts,
    hubCodeMap,
    totalFrames,
    seekToTimestamp,
    getEventWindowStatus,
    humanizeAuditText,
}: ReplayAuditTabProps) {
    const td = useTranslations("flights.deck");
    const tCtrl = useTranslations("controlCenter");
    const tEmergency = useTranslations("emergency");
    const tConflicts = useTranslations("conflicts");
    const locale = useLocale() as AppLocale;

    return (
        <>
            <section className="rounded-md border border-slate-200 bg-white overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-800">
                        {td("flightCommandLog")}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                        {sortedCommands.length}
                    </span>
                </div>

                {sortedCommands.length === 0 ? (
                    <div className="px-3 py-5 text-center text-[11px] text-slate-400 font-mono">
                        {tCtrl("noRecentCommands")}
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto utm-scroll">
                        {sortedCommands.map((cmd) => {
                            const paramSummary = summarizeCommandParams(cmd.parameters, hubCodeMap);
                            const cmdTs = cmd.issuedAt || cmd.createdOn;
                            const canSeek = totalFrames > 1 && Boolean(cmdTs);
                            const ackMs =
                                cmd.issuedAt && cmd.acknowledgedAt
                                    ? Math.max(
                                          0,
                                          Date.parse(cmd.acknowledgedAt) - Date.parse(cmd.issuedAt)
                                      )
                                    : null;
                            return (
                                <button
                                    key={cmd.id}
                                    type="button"
                                    disabled={!canSeek}
                                    onClick={() => seekToTimestamp(cmdTs)}
                                    className={cn(
                                        "w-full text-left px-3 py-2 flex items-center justify-between gap-2 font-mono text-[11px] transition-colors",
                                        canSeek
                                            ? "hover:bg-slate-50 cursor-pointer focus-visible:outline-none focus-visible:bg-slate-50"
                                            : "cursor-default"
                                    )}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 truncate">
                                            <span className="text-slate-500 tabular-nums shrink-0">
                                                {cmdTs ? formatTime(cmdTs) : "--:--:--"}
                                            </span>
                                            <span className="font-bold text-slate-900 uppercase">
                                                {localizeResponseAction(
                                                    cmd.commandType,
                                                    locale,
                                                    true
                                                )}
                                            </span>
                                            {paramSummary && (
                                                <span className="text-slate-500 truncate">
                                                    {paramSummary}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                            {ackMs != null && <span>ACK {ackMs}ms</span>}
                                            {canSeek && (
                                                <span className="inline-flex items-center gap-0.5 text-amber-700 font-semibold">
                                                    <span>{td("seekToEvent")}</span>
                                                    <ArrowUpRight className="w-2.5 h-2.5" />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <StatusBadge status={cmd.status ?? DEFAULT_COMMAND_STATUS} />
                                </button>
                            );
                        })}
                    </div>
                )}
            </section>

            {recordedIncidents.length === 0 && recordedConflicts.length === 0 ? (
                <EmptyState
                    compact
                    icon={ShieldCheck}
                    title={td("safetyNominalTitle")}
                    description={td("safetyNominalDesc")}
                    className="py-8"
                />
            ) : (
                <div className="space-y-3">
                    {recordedIncidents.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase text-slate-800">
                                <Siren className="w-3.5 h-3.5 text-red-600" />
                                <span>
                                    {td("recordedIncidentsHeading", {
                                        count: recordedIncidents.length,
                                    })}
                                </span>
                            </div>
                            {recordedIncidents.map((inc) => {
                                const incTs = inc.detectedAt || inc.createdOn;
                                const windowStatus = getEventWindowStatus(incTs);
                                const isOutOfWindow =
                                    windowStatus === "pre_flight" || windowStatus === "post_flight";
                                const canSeek = totalFrames > 1 && windowStatus === "in_window";
                                return (
                                    <button
                                        key={inc.id}
                                        type="button"
                                        disabled={!canSeek}
                                        onClick={() => {
                                            if (canSeek) {
                                                seekToTimestamp(incTs);
                                            }
                                        }}
                                        className={cn(
                                            "w-full text-left rounded-md border border-slate-200 bg-white p-3 space-y-1.5 transition-colors",
                                            canSeek
                                                ? "hover:bg-slate-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                                : "cursor-default"
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-mono text-xs font-bold uppercase text-slate-900">
                                                {inc.emergencyType &&
                                                (EMERGENCY_TYPES as readonly string[]).includes(
                                                    inc.emergencyType
                                                )
                                                    ? tEmergency(
                                                          `types.${inc.emergencyType as EmergencyType}`
                                                      )
                                                    : localizeAlertTypeTitle(
                                                          inc.emergencyType || "INCIDENT",
                                                          locale
                                                      )}
                                            </span>
                                            <StatusBadge status={inc.severity} />
                                        </div>
                                        {inc.message && (
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                                {humanizeAuditText(inc.message)}
                                            </p>
                                        )}
                                        <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-slate-500">
                                            <div className="flex items-center gap-2">
                                                {inc.responseAction &&
                                                    inc.responseAction !== RESPONSE_ACTION.NONE && (
                                                        <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-bold text-slate-700">
                                                            {localizeResponseAction(
                                                                inc.responseAction,
                                                                locale,
                                                                true
                                                            )}
                                                        </span>
                                                    )}
                                                {incTs && (
                                                    <span className="tabular-nums">
                                                        {isOutOfWindow
                                                            ? formatDateTime(
                                                                  incTs,
                                                                  "dd/MM HH:mm:ss"
                                                              )
                                                            : formatTime(incTs)}
                                                    </span>
                                                )}
                                            </div>
                                            {canSeek ? (
                                                <span className="inline-flex items-center gap-0.5 text-amber-700 font-semibold">
                                                    <span>{td("seekToEvent")}</span>
                                                    <ArrowUpRight className="w-2.5 h-2.5" />
                                                </span>
                                            ) : (
                                                isOutOfWindow && (
                                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-semibold text-slate-600">
                                                        {td(
                                                            windowStatus === "pre_flight"
                                                                ? "preFlightEvent"
                                                                : "postFlightEvent"
                                                        )}
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {recordedConflicts.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase text-slate-800">
                                <AlertOctagon className="w-3.5 h-3.5 text-amber-600" />
                                <span>
                                    {td("recordedConflictsHeading", {
                                        count: recordedConflicts.length,
                                    })}
                                </span>
                            </div>
                            {recordedConflicts.map((c) => {
                                const cnfTs = c.detectedAt || c.createdOn;
                                const windowStatus = getEventWindowStatus(cnfTs);
                                const isOutOfWindow =
                                    windowStatus === "pre_flight" || windowStatus === "post_flight";
                                const canSeek = totalFrames > 1 && windowStatus === "in_window";
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        disabled={!canSeek}
                                        onClick={() => {
                                            if (canSeek) {
                                                seekToTimestamp(cnfTs);
                                            }
                                        }}
                                        className={cn(
                                            "w-full text-left rounded-md border border-slate-200 bg-white p-3 space-y-1.5 transition-colors",
                                            canSeek
                                                ? "hover:bg-slate-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                                : "cursor-default"
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-mono text-xs font-bold uppercase text-slate-900">
                                                {c.conflictType &&
                                                tConflicts.has(`types.${c.conflictType}`)
                                                    ? tConflicts(`types.${c.conflictType}`)
                                                    : localizeAlertTypeTitle(
                                                          c.conflictType ?? "SEPARATION",
                                                          locale
                                                      )}
                                            </span>
                                            <StatusBadge status={c.severity ?? "warning"} />
                                        </div>
                                        {c.description && (
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                                {humanizeAuditText(c.description)}
                                            </p>
                                        )}
                                        {(cnfTs || canSeek || isOutOfWindow) && (
                                            <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-slate-500">
                                                <span className="tabular-nums">
                                                    {cnfTs
                                                        ? isOutOfWindow
                                                            ? formatDateTime(
                                                                  cnfTs,
                                                                  "dd/MM HH:mm:ss"
                                                              )
                                                            : formatTime(cnfTs)
                                                        : ""}
                                                </span>
                                                {canSeek ? (
                                                    <span className="inline-flex items-center gap-0.5 text-amber-700 font-semibold">
                                                        <span>{td("seekToEvent")}</span>
                                                        <ArrowUpRight className="w-2.5 h-2.5" />
                                                    </span>
                                                ) : (
                                                    isOutOfWindow && (
                                                        <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-semibold text-slate-600">
                                                            {td(
                                                                windowStatus === "pre_flight"
                                                                    ? "preFlightEvent"
                                                                    : "postFlightEvent"
                                                            )}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </>
    );
}

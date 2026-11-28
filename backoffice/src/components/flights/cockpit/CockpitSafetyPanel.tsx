"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertOctagon, Check, Siren, X } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui";
import { emergencyService } from "@/services";
import { QUERY_KEYS } from "@/hooks";
import type { AppLocale } from "@/i18n";
import { formatRelativeTime, localizeResponseAction, localizeServerText } from "@/utils";
import {
    EMERGENCY_TYPES,
    INCIDENT_STATUS,
    RESPONSE_ACTION,
    type Conflict,
    type EmergencyIncidentVm,
    type EmergencyType,
    type Flight,
} from "@/types";
import { CockpitConflictItem } from "./CockpitConflictItem";

export interface OnboardDiagnosticFlag {
    level: "error" | "warning";
    msg: string;
}

interface CockpitSafetyPanelProps {
    flight: Flight;
    flightIncidents: EmergencyIncidentVm[];
    flightConflicts: Conflict[];
    onboardFlags: OnboardDiagnosticFlag[];
    safetyCount: number;
    entityMap: ReadonlyMap<string, string>;
}

export function CockpitSafetyPanel({
    flight,
    flightIncidents,
    flightConflicts,
    onboardFlags,
    safetyCount,
    entityMap,
}: CockpitSafetyPanelProps) {
    const t = useTranslations("flights.deck");
    const tEmergency = useTranslations("emergency");
    const tc = useTranslations("common");
    const locale = useLocale() as AppLocale;
    const queryClient = useQueryClient();

    const confirmIncidentMutation = useMutation({
        mutationFn: (vars: { id: string; approved: boolean }) =>
            emergencyService.confirmIncident(vars.id, { approved: vars.approved }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyActive });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyPending });
            toast.success(t("incidentUpdatedToast"));
        },
        meta: { defaultErrorMessage: t("incidentUpdateFailed") },
    });

    return (
        <div className="p-3 space-y-3 overflow-y-auto utm-scroll max-h-96 text-xs">
            {safetyCount === 0 ? (
                <div className="py-6 text-center space-y-1">
                    <div className="font-mono font-bold text-emerald-400">
                        {t("safetyNominalTitle")}
                    </div>
                    <p className="text-[11px] text-slate-400">{t("safetyNominalDesc")}</p>
                </div>
            ) : (
                <>
                    {flightIncidents.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase text-red-300">
                                <Siren className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>
                                    {t("activeIncidentsHeading", {
                                        count: flightIncidents.length,
                                    })}
                                </span>
                            </div>
                            {flightIncidents.map((inc) => {
                                const isAwaiting =
                                    inc.status === INCIDENT_STATUS.PENDING_CONFIRMATION;
                                return (
                                    <div
                                        key={inc.id}
                                        className="rounded border border-slate-700/85 bg-slate-800/75 p-2.5 space-y-2"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-mono text-xs font-bold uppercase text-white">
                                                {inc.emergencyType &&
                                                (EMERGENCY_TYPES as readonly string[]).includes(
                                                    inc.emergencyType
                                                )
                                                    ? tEmergency(
                                                          `types.${inc.emergencyType as EmergencyType}`
                                                      )
                                                    : (inc.emergencyType || "INCIDENT").replace(
                                                          /_/g,
                                                          " "
                                                      )}
                                            </span>
                                            <StatusBadge status={inc.severity} tone="dark" />
                                        </div>
                                        {inc.message && (
                                            <p className="text-xs text-slate-300">
                                                {localizeServerText(inc.message, locale, {
                                                    entityMap,
                                                })}
                                            </p>
                                        )}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
                                                {inc.responseAction &&
                                                    inc.responseAction !== RESPONSE_ACTION.NONE && (
                                                        <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-200 border border-slate-700 font-bold">
                                                            {localizeResponseAction(
                                                                inc.responseAction,
                                                                locale,
                                                                true
                                                            )}
                                                        </span>
                                                    )}
                                                <span>{formatRelativeTime(inc.detectedAt)}</span>
                                            </div>
                                            {isAwaiting && (
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        disabled={confirmIncidentMutation.isPending}
                                                        onClick={() =>
                                                            confirmIncidentMutation.mutate({
                                                                id: inc.id,
                                                                approved: true,
                                                            })
                                                        }
                                                        className="chamfer-xs h-6 px-2 bg-white hover:bg-slate-200 text-slate-950 font-mono text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                                    >
                                                        <Check className="w-3 h-3" />
                                                        <span>{tc("confirm")}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={confirmIncidentMutation.isPending}
                                                        onClick={() =>
                                                            confirmIncidentMutation.mutate({
                                                                id: inc.id,
                                                                approved: false,
                                                            })
                                                        }
                                                        className="h-6 px-2 rounded border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[10px] inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                                    >
                                                        <X className="w-3 h-3" />
                                                        <span>{t("rejectIncident")}</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {flightConflicts.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase text-amber-300">
                                <AlertOctagon className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>
                                    {t("activeConflictsHeading", {
                                        count: flightConflicts.length,
                                    })}
                                </span>
                            </div>
                            {flightConflicts.map((conflict) => (
                                <CockpitConflictItem
                                    key={conflict.id}
                                    conflict={conflict}
                                    flight={flight}
                                    entityMap={entityMap}
                                />
                            ))}
                        </div>
                    )}

                    {onboardFlags.length > 0 && (
                        <div className="space-y-1.5">
                            <span className="block font-mono text-[11px] font-bold uppercase text-slate-300">
                                {t("onboardDiagnostics")}
                            </span>
                            {onboardFlags.map((flag, idx) => (
                                <div
                                    key={`${flag.level}-${idx}`}
                                    className="rounded border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 flex items-center justify-between gap-2 font-mono text-[11px]"
                                >
                                    <span className="text-slate-200 truncate">
                                        {localizeServerText(flag.msg, locale, {
                                            entityMap,
                                        })}
                                    </span>
                                    <StatusBadge
                                        status={flag.level === "error" ? "critical" : "warning"}
                                        tone="dark"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

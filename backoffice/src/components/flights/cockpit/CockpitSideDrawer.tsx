"use client";

import { useState, useMemo, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Terminal,
    ShieldAlert,
    Activity,
    Siren,
    AlertOctagon,
    Sparkles,
    Check,
    X,
} from "lucide-react";
import { toast } from "sonner";
import { AltitudeProfile, type LiveAltitudeProgress } from "@/components/map";
import { StatusBadge } from "@/components/ui";
import { conflictService, droneService, emergencyService } from "@/services";
import {
    QUERY_KEYS,
    useConflictAdvice,
    useConflictsActive,
    useEmergencyActiveIncidents,
    useEntityCodeMap,
    useFlightCommands,
} from "@/hooks";
import type { AppLocale } from "@/i18n";
import { cn } from "@/lib";
import {
    formatRelativeTime,
    formatTime,
    localizeResponseAction,
    localizeServerText,
} from "@/utils";
import { summarizeCommandParams } from "../routeProgressUtils";
import {
    COMMAND_STATUS,
    DEFAULT_COMMAND_STATUS,
    EMERGENCY_TYPES,
    INCIDENT_STATUS,
    RESOLUTION_STRATEGY,
    RESPONSE_ACTION,
    type AirspaceZone,
    type CommandType,
    type Conflict,
    type DroneCommand,
    type EmergencyType,
    type Flight,
    type Hub,
    type ResolutionAdviceOption,
    type TelemetryRecord,
} from "@/types";

export type CockpitDrawerTab = "commands" | "safety" | "profile" | null;

export interface CockpitSideDrawerProps {
    flight: Flight;
    hubs: Hub[];
    departureHub: Hub | null;
    arrivalHub: Hub | null;
    airspaceZones: AirspaceZone[];
    telemetry: TelemetryRecord | null;
    liveAltitudeProgress: LiveAltitudeProgress | null;
}

function CockpitConflictItem({
    conflict,
    flight,
    entityMap,
}: {
    conflict: Conflict;
    flight: Flight;
    entityMap: ReadonlyMap<string, string>;
}) {
    const t = useTranslations("flights.deck");
    const tConflicts = useTranslations("conflicts");
    const locale = useLocale() as AppLocale;
    const queryClient = useQueryClient();
    const { data: advice } = useConflictAdvice(conflict.id, Boolean(conflict.id));
    const topOption: ResolutionAdviceOption | undefined = advice?.options?.[0];

    const applyAdviceMutation = useMutation({
        mutationFn: async (opt: ResolutionAdviceOption) => {
            if (flight.droneId && opt.commandType) {
                const normalizedCmd = opt.commandType.toLowerCase() as CommandType;
                await droneService.sendCommand(flight.droneId, {
                    commandType: normalizedCmd,
                    flightId: flight.id,
                    parameters: opt.recommendedActions
                        ? JSON.stringify(opt.recommendedActions)
                        : undefined,
                });
            }
            const strategy = opt.strategy?.toLowerCase() || RESOLUTION_STRATEGY.ALTITUDE_CHANGE;
            return conflictService.resolve(conflict.id, {
                strategy,
                actions: opt.recommendedActions ?? {
                    source: "cockpit",
                    rationale: opt.rationale || "Applied tactical resolution from Cockpit",
                },
            });
        },
        onSuccess: () => {
            toast.success(t("conflictResolvedToast"));
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conflictsActive });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightCommands(flight.id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightDetail(flight.id) });
        },
        meta: { defaultErrorMessage: t("conflictResolveFailed") },
    });

    const ackConflictMutation = useMutation({
        mutationFn: () => conflictService.acknowledge(conflict.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conflictsActive });
        },
        meta: { defaultErrorMessage: t("conflictResolveFailed") },
    });

    return (
        <div className="rounded border border-slate-700/85 bg-slate-800/75 p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold uppercase text-white truncate">
                    {conflict.conflictType && tConflicts.has(`types.${conflict.conflictType}`)
                        ? tConflicts(`types.${conflict.conflictType}`)
                        : (conflict.conflictType ?? "SEPARATION").replace(/_/g, " ")}
                </span>
                <StatusBadge status={conflict.severity ?? "warning"} tone="dark" />
            </div>

            {conflict.description && (
                <p className="text-xs text-slate-300 leading-relaxed">
                    {localizeServerText(
                        flight.flightNumber
                            ? conflict.description.replaceAll(flight.id, flight.flightNumber)
                            : conflict.description,
                        locale,
                        { entityMap }
                    )}
                </p>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-slate-400">
                {conflict.separationDistance != null && (
                    <span>H-Sep: {Math.round(conflict.separationDistance)}m</span>
                )}
                {conflict.verticalSeparation != null && (
                    <span>V-Sep: {Math.round(conflict.verticalSeparation)}m</span>
                )}
                {conflict.timeToConflictSec != null && (
                    <span>TCPA: {Math.round(conflict.timeToConflictSec)}s</span>
                )}
            </div>

            {topOption && (
                <div className="rounded bg-slate-900/90 border border-slate-700 p-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-amber-300">
                        <span className="inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3" aria-hidden="true" />
                            <span>{t("recommendedAction")}</span>
                        </span>
                        <span>
                            {topOption.commandType
                                ? localizeResponseAction(topOption.commandType, locale, true)
                                : topOption.strategy.toUpperCase()}
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                        {localizeServerText(topOption.rationale, locale, { entityMap })}
                    </p>
                    <div className="flex items-center justify-end gap-1.5 pt-0.5">
                        <button
                            type="button"
                            disabled={ackConflictMutation.isPending}
                            onClick={() => ackConflictMutation.mutate()}
                            className="h-6 px-2 rounded border border-slate-600 bg-slate-800 hover:bg-slate-700 text-[10px] font-mono font-semibold text-slate-200 cursor-pointer disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        >
                            {t("ackConflict")}
                        </button>
                        <button
                            type="button"
                            disabled={applyAdviceMutation.isPending}
                            onClick={() => applyAdviceMutation.mutate(topOption)}
                            className="chamfer-xs h-6 px-2.5 bg-white hover:bg-slate-200 text-[10px] font-mono font-bold uppercase text-slate-950 cursor-pointer disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        >
                            {t("applyResolution")}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export function CockpitSideDrawer({
    flight,
    hubs,
    departureHub,
    arrivalHub,
    airspaceZones,
    telemetry,
    liveAltitudeProgress,
}: CockpitSideDrawerProps) {
    const t = useTranslations("flights.deck");
    const tEmergency = useTranslations("emergency");
    const tCtrl = useTranslations("controlCenter");
    const tc = useTranslations("common");
    const locale = useLocale() as AppLocale;
    const entityMap = useEntityCodeMap();
    const queryClient = useQueryClient();

    const { data: flightCommands = [] } = useFlightCommands(flight.id, Boolean(flight.id));
    const { data: activeConflicts = [] } = useConflictsActive();
    const { data: activeIncidents = [] } = useEmergencyActiveIncidents();

    const hubCodeMap = useMemo(() => {
        const m = new Map<string, string>();
        for (const h of hubs) {
            if (h.id) m.set(h.id, h.code || h.name || h.id);
        }
        return m;
    }, [hubs]);

    const sortedCommands = useMemo(() => {
        return [...flightCommands].sort((a, b) => {
            const tA = Date.parse(a.issuedAt || a.createdOn || "") || 0;
            const tB = Date.parse(b.issuedAt || b.createdOn || "") || 0;
            return tB - tA;
        });
    }, [flightCommands]);

    const flightConflicts = useMemo(
        () =>
            activeConflicts.filter(
                (c) => c.primaryFlightId === flight.id || c.secondaryFlightId === flight.id
            ),
        [activeConflicts, flight.id]
    );

    const flightIncidents = useMemo(
        () =>
            activeIncidents.filter(
                (inc) =>
                    inc.flightId === flight.id ||
                    (Boolean(flight.droneId) && inc.droneId === flight.droneId)
            ),
        [activeIncidents, flight.id, flight.droneId]
    );

    const onboardFlags = useMemo(() => {
        const errs = (telemetry?.errors ?? []).map((msg) => ({ level: "error" as const, msg }));
        const warns = (telemetry?.warnings ?? []).map((msg) => ({
            level: "warning" as const,
            msg,
        }));
        return [...errs, ...warns];
    }, [telemetry]);

    const safetyCount = flightConflicts.length + flightIncidents.length + onboardFlags.length;

    const [prevFlightId, setPrevFlightId] = useState(flight.id);
    const [openTab, setOpenTab] = useState<CockpitDrawerTab>(null);
    const [autoOpenedSafety, setAutoOpenedSafety] = useState(false);

    if (flight.id !== prevFlightId) {
        setPrevFlightId(flight.id);
        setAutoOpenedSafety(false);
        setOpenTab(null);
    }

    if (safetyCount > 0 && !autoOpenedSafety) {
        setAutoOpenedSafety(true);
        setOpenTab("safety");
    }

    useEffect(() => {
        if (openTab === null) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setOpenTab(null);
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [openTab]);

    const cancelCommandMutation = useMutation({
        mutationFn: async (cmd: DroneCommand) => {
            if (!flight.droneId) throw new Error(tCtrl("disabledReasons.selectAircraft"));
            return droneService.cancelCommand(flight.droneId, cmd.id);
        },
        onSuccess: () => {
            toast.success(t("commandCancelledToast"));
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightCommands(flight.id) });
            if (flight.droneId) {
                queryClient.invalidateQueries({
                    queryKey: QUERY_KEYS.droneCommands(flight.droneId),
                });
            }
        },
        meta: { defaultErrorMessage: t("commandCancelFailed") },
    });

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

    const toggleTab = (tab: Exclude<CockpitDrawerTab, null>) => {
        setOpenTab((prev) => (prev === tab ? null : tab));
    };

    return (
        <div className="absolute top-14 right-3.5 z-30 flex flex-col items-end gap-2 max-w-[calc(100vw-1.75rem)] pointer-events-none">
            <div className="flex flex-wrap items-center justify-end gap-1.5 pointer-events-auto">
                <button
                    type="button"
                    aria-pressed={openTab === "commands"}
                    onClick={() => toggleTab("commands")}
                    className={cn(
                        "h-8 px-2.5 rounded-md border text-[11px] font-mono font-semibold inline-flex items-center gap-1.5 backdrop-blur-md shadow-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                        openTab === "commands"
                            ? "bg-slate-200 border-slate-200 text-slate-950 font-bold"
                            : "bg-slate-900/90 border-slate-700/80 text-slate-200 hover:bg-slate-800 hover:text-white"
                    )}
                >
                    <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>
                        {t("drawerCommands")} ({sortedCommands.length})
                    </span>
                </button>

                <button
                    type="button"
                    aria-pressed={openTab === "safety"}
                    onClick={() => toggleTab("safety")}
                    className={cn(
                        "h-8 px-2.5 rounded-md border text-[11px] font-mono font-semibold inline-flex items-center gap-1.5 backdrop-blur-md shadow-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                        openTab === "safety"
                            ? "bg-slate-200 border-slate-200 text-slate-950 font-bold"
                            : safetyCount > 0
                              ? "bg-red-950/90 border-red-600/80 text-red-100 hover:bg-red-900/90"
                              : "bg-slate-900/90 border-slate-700/80 text-slate-200 hover:bg-slate-800 hover:text-white"
                    )}
                >
                    <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t("tabSafety")}</span>
                    {safetyCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-bold leading-tight">
                            {safetyCount}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    aria-pressed={openTab === "profile"}
                    onClick={() => toggleTab("profile")}
                    className={cn(
                        "h-8 px-2.5 rounded-md border text-[11px] font-mono font-semibold inline-flex items-center gap-1.5 backdrop-blur-md shadow-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                        openTab === "profile"
                            ? "bg-slate-200 border-slate-200 text-slate-950 font-bold"
                            : "bg-slate-900/90 border-slate-700/80 text-slate-200 hover:bg-slate-800 hover:text-white"
                    )}
                >
                    <Activity className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t("drawerProfile4d")}</span>
                </button>
            </div>

            {openTab !== null && (
                <div className="w-[calc(100vw-1.75rem)] sm:w-[360px] max-h-[calc(100vh-14rem)] rounded-md border border-slate-700/85 bg-slate-900/95 text-slate-100 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col pointer-events-auto">
                    <div className="px-3 py-2 border-b border-slate-700/80 flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-200">
                            {openTab === "commands"
                                ? t("flightCommandLog")
                                : openTab === "safety"
                                  ? t("tabSafety")
                                  : t("drawerProfile4d")}
                        </span>
                        <button
                            type="button"
                            onClick={() => setOpenTab(null)}
                            aria-label={tc("close")}
                            className="w-6 h-6 rounded hover:bg-slate-800 inline-flex items-center justify-center text-slate-400 hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        >
                            <X className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                    </div>

                    {openTab === "commands" && (
                        <div className="overflow-y-auto utm-scroll divide-y divide-slate-800 max-h-80">
                            {sortedCommands.length === 0 ? (
                                <div className="px-3 py-8 text-center text-xs font-mono text-slate-400">
                                    {tCtrl("noRecentCommands")}
                                </div>
                            ) : (
                                sortedCommands.map((cmd) => {
                                    const statusLower = (
                                        cmd.status ?? DEFAULT_COMMAND_STATUS
                                    ).toLowerCase();
                                    const canCancel =
                                        statusLower === COMMAND_STATUS.PENDING ||
                                        statusLower === COMMAND_STATUS.SENT;
                                    const paramSummary = summarizeCommandParams(
                                        cmd.parameters,
                                        hubCodeMap
                                    );
                                    const ackMs =
                                        cmd.issuedAt && cmd.acknowledgedAt
                                            ? Math.max(
                                                  0,
                                                  Date.parse(cmd.acknowledgedAt) -
                                                      Date.parse(cmd.issuedAt)
                                              )
                                            : null;

                                    return (
                                        <div
                                            key={cmd.id}
                                            className="px-3 py-2 flex items-center justify-between gap-2 font-mono text-[11px]"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <span className="text-slate-400 tabular-nums shrink-0">
                                                        {cmd.issuedAt || cmd.createdOn
                                                            ? formatTime(
                                                                  cmd.issuedAt || cmd.createdOn
                                                              )
                                                            : "--:--:--"}
                                                    </span>
                                                    <span className="font-bold text-white uppercase">
                                                        {localizeResponseAction(
                                                            cmd.commandType,
                                                            locale,
                                                            true
                                                        )}
                                                    </span>
                                                    {paramSummary && (
                                                        <span className="text-slate-300 truncate">
                                                            {paramSummary}
                                                        </span>
                                                    )}
                                                </div>
                                                {(ackMs != null || cmd.errorMessage) && (
                                                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                                        {ackMs != null && (
                                                            <span>ACK {ackMs}ms</span>
                                                        )}
                                                        {cmd.errorMessage && (
                                                            <span className="text-red-400 ml-1">
                                                                {localizeServerText(
                                                                    cmd.errorMessage,
                                                                    locale,
                                                                    { entityMap }
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {canCancel && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            cancelCommandMutation.mutate(cmd)
                                                        }
                                                        disabled={cancelCommandMutation.isPending}
                                                        className="px-1.5 py-0.5 rounded border border-slate-600 hover:bg-slate-800 text-[10px] text-slate-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                                    >
                                                        {tc("cancel")}
                                                    </button>
                                                )}
                                                <StatusBadge
                                                    status={cmd.status ?? DEFAULT_COMMAND_STATUS}
                                                    tone="dark"
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {openTab === "safety" && (
                        <div className="p-3 space-y-3 overflow-y-auto utm-scroll max-h-96 text-xs">
                            {safetyCount === 0 ? (
                                <div className="py-6 text-center space-y-1">
                                    <div className="font-mono font-bold text-emerald-400">
                                        {t("safetyNominalTitle")}
                                    </div>
                                    <p className="text-[11px] text-slate-400">
                                        {t("safetyNominalDesc")}
                                    </p>
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
                                                    inc.status ===
                                                    INCIDENT_STATUS.PENDING_CONFIRMATION;
                                                return (
                                                    <div
                                                        key={inc.id}
                                                        className="rounded border border-slate-700/85 bg-slate-800/75 p-2.5 space-y-2"
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="font-mono text-xs font-bold uppercase text-white">
                                                                {inc.emergencyType &&
                                                                (
                                                                    EMERGENCY_TYPES as readonly string[]
                                                                ).includes(inc.emergencyType)
                                                                    ? tEmergency(
                                                                          `types.${inc.emergencyType as EmergencyType}`
                                                                      )
                                                                    : (
                                                                          inc.emergencyType ||
                                                                          "INCIDENT"
                                                                      ).replace(/_/g, " ")}
                                                            </span>
                                                            <StatusBadge
                                                                status={inc.severity}
                                                                tone="dark"
                                                            />
                                                        </div>
                                                        {inc.message && (
                                                            <p className="text-xs text-slate-300">
                                                                {localizeServerText(
                                                                    inc.message,
                                                                    locale,
                                                                    { entityMap }
                                                                )}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
                                                                {inc.responseAction &&
                                                                    inc.responseAction !==
                                                                        RESPONSE_ACTION.NONE && (
                                                                        <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-200 border border-slate-700 font-bold">
                                                                            {localizeResponseAction(
                                                                                inc.responseAction,
                                                                                locale,
                                                                                true
                                                                            )}
                                                                        </span>
                                                                    )}
                                                                <span>
                                                                    {formatRelativeTime(
                                                                        inc.detectedAt
                                                                    )}
                                                                </span>
                                                            </div>
                                                            {isAwaiting && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <button
                                                                        type="button"
                                                                        disabled={
                                                                            confirmIncidentMutation.isPending
                                                                        }
                                                                        onClick={() =>
                                                                            confirmIncidentMutation.mutate(
                                                                                {
                                                                                    id: inc.id,
                                                                                    approved: true,
                                                                                }
                                                                            )
                                                                        }
                                                                        className="chamfer-xs h-6 px-2 bg-white hover:bg-slate-200 text-slate-950 font-mono text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                                                    >
                                                                        <Check className="w-3 h-3" />
                                                                        <span>{tc("confirm")}</span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        disabled={
                                                                            confirmIncidentMutation.isPending
                                                                        }
                                                                        onClick={() =>
                                                                            confirmIncidentMutation.mutate(
                                                                                {
                                                                                    id: inc.id,
                                                                                    approved: false,
                                                                                }
                                                                            )
                                                                        }
                                                                        className="h-6 px-2 rounded border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[10px] inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                        <span>
                                                                            {t("rejectIncident")}
                                                                        </span>
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
                                                <AlertOctagon
                                                    className="w-3.5 h-3.5"
                                                    aria-hidden="true"
                                                />
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
                                                        status={
                                                            flag.level === "error"
                                                                ? "critical"
                                                                : "warning"
                                                        }
                                                        tone="dark"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {openTab === "profile" && (
                        <AltitudeProfile
                            waypoints={flight.waypoints ?? []}
                            selectedWaypointId={null}
                            onWaypointClick={() => {}}
                            onPointClick={() => {}}
                            departureHub={departureHub}
                            arrivalHub={arrivalHub}
                            airspaceZones={airspaceZones}
                            liveProgress={liveAltitudeProgress}
                            cruisingAltitudeM={flight.cruisingAltitudeM}
                            tone="dark"
                            hideHeader
                        />
                    )}
                </div>
            )}
        </div>
    );
}

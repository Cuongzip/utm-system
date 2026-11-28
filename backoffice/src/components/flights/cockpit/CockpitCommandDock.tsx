"use client";

import { memo, useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    PlaneTakeoff,
    PlaneLanding,
    Home,
    Pause,
    CircleDot,
    Play,
    OctagonAlert,
    Crosshair,
    ArrowUpDown,
    Gauge,
    CornerUpRight,
    Loader2,
    X,
    ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog, CustomSelect, type SelectOption } from "@/components/ui";
import { droneService } from "@/services";
import { QUERY_KEYS, useFlightCommands } from "@/hooks";
import { useAppLocale } from "@/i18n";
import { cn } from "@/lib";
import { calculateDistance, formatDistance, localizeResponseAction } from "@/utils";
import type { GotoDraftTarget } from "../FlightDeckMapOverlay";
import {
    ACTIVE_FLIGHT_STATUSES,
    COMMAND_TYPE,
    CONTROLLABLE_FLIGHT_STATUSES,
    FLIGHT_STATUS,
    HUB_STATUS,
    IN_PROGRESS_COMMAND_STATUSES,
    type CommandType,
    type Drone,
    type Flight,
    type Hub,
    type TelemetryRecord,
} from "@/types";

export type VectorPopoverType = "alt" | "speed" | "goto" | "divert" | null;

export interface CockpitCommandDockProps {
    flight: Flight;
    drone: Drone | null;
    hubs: Hub[];
    telemetry: TelemetryRecord | null;
    gotoPickMode: boolean;
    onToggleGotoPickMode: (next: boolean) => void;
    gotoDraft: GotoDraftTarget | null;
    onChangeGotoDraft: (next: GotoDraftTarget | null) => void;
    activePopover: VectorPopoverType;
    onChangeActivePopover: (next: VectorPopoverType) => void;
}

interface PendingConfirmState {
    title: string;
    description: string;
    confirmText: string;
    commandType: CommandType;
    parameters?: string;
}

export const CockpitCommandDock = memo(function CockpitCommandDock({
    flight,
    drone,
    hubs,
    telemetry,
    gotoPickMode,
    onToggleGotoPickMode,
    gotoDraft,
    onChangeGotoDraft,
    activePopover,
    onChangeActivePopover,
}: CockpitCommandDockProps) {
    const t = useTranslations("flights.deck");
    const tCtrl = useTranslations("controlCenter");
    const tc = useTranslations("common");
    const locale = useAppLocale();
    const queryClient = useQueryClient();

    const droneId = flight.droneId ?? null;
    const isControllableStatus = Boolean(
        flight.status && CONTROLLABLE_FLIGHT_STATUSES.includes(flight.status)
    );
    const isTerminal = Boolean(
        flight.status &&
        (flight.status === FLIGHT_STATUS.COMPLETED ||
            flight.status === FLIGHT_STATUS.EMERGENCY_LANDING ||
            flight.status === FLIGHT_STATUS.CANCELLED)
    );
    const isFlightActive = Boolean(flight.status && ACTIVE_FLIGHT_STATUSES.includes(flight.status));
    const isPhysicallyAirborne = Boolean(telemetry?.altitude != null && telemetry.altitude > 1.5);
    const isAirborne = isFlightActive || isPhysicallyAirborne;
    const c2Enabled = Boolean(droneId) && isControllableStatus;
    const showPreTakeoffBar = c2Enabled && !isPhysicallyAirborne;

    const [altitudeInput, setAltitudeInput] = useState<string>(() =>
        String(Math.round(flight.cruisingAltitudeM ?? 120))
    );
    const [speedInput, setSpeedInput] = useState<string>(() =>
        String(Math.round(drone?.cruiseSpeedMs ?? 15))
    );
    const [divertHubId, setDivertHubId] = useState<string>("");
    const [divertReason, setDivertReason] = useState<string>("");
    const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmState | null>(null);

    const gotoCoordKey = gotoDraft
        ? `${gotoDraft.latitude.toFixed(6)}_${gotoDraft.longitude.toFixed(6)}`
        : "";
    const [prevGotoCoordKey, setPrevGotoCoordKey] = useState(gotoCoordKey);
    const [gotoAltInput, setGotoAltInput] = useState<string>(() =>
        gotoDraft ? String(gotoDraft.altitude) : ""
    );

    if (gotoCoordKey !== prevGotoCoordKey) {
        setPrevGotoCoordKey(gotoCoordKey);
        setGotoAltInput(gotoDraft ? String(gotoDraft.altitude) : "");
    }

    useEffect(() => {
        if (!activePopover) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onChangeActivePopover(null);
                onToggleGotoPickMode(false);
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [activePopover, onChangeActivePopover, onToggleGotoPickMode]);

    const { data: flightCommands = [] } = useFlightCommands(flight.id, Boolean(flight.id));

    const activeCommandType = useMemo(() => {
        const running = flightCommands.find(
            (c) => c.status != null && IN_PROGRESS_COMMAND_STATUSES.includes(c.status.toLowerCase())
        );
        return running?.commandType ? running.commandType.toLowerCase() : null;
    }, [flightCommands]);

    const alternateHubOptions: SelectOption[] = useMemo(() => {
        if (activePopover !== "divert") return [];
        const activeHubs = hubs.filter(
            (h) =>
                h.id &&
                h.id !== flight.arrivalHubId &&
                (h.status ?? "").toLowerCase() !== HUB_STATUS.INACTIVE &&
                h.location?.latitude !== undefined &&
                h.location?.longitude !== undefined
        );
        return [
            { value: "", label: t("selectAlternateHub") },
            ...activeHubs.map((h) => {
                const distSuffix =
                    telemetry?.latitude != null && telemetry?.longitude != null
                        ? ` · ${formatDistance(
                              calculateDistance(
                                  telemetry.latitude,
                                  telemetry.longitude,
                                  h.location!.latitude,
                                  h.location!.longitude
                              )
                          )}`
                        : "";
                return {
                    value: h.id,
                    label: `${h.code || h.name} — ${h.name}${distSuffix}`,
                };
            }),
        ];
    }, [activePopover, hubs, flight.arrivalHubId, telemetry, t]);

    const invalidateAllAfterCommand = () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightCommands(flight.id) });
        if (droneId) {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.droneCommands(droneId) });
        }
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightDetail(flight.id) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightsAll });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightConformance(flight.id) });
    };

    const sendCommandMutation = useMutation({
        mutationFn: async (vars: { commandType: CommandType; parameters?: string }) => {
            if (!droneId) throw new Error(tCtrl("disabledReasons.selectAircraft"));
            return droneService.sendCommand(droneId, {
                commandType: vars.commandType,
                flightId: flight.id,
                parameters: vars.parameters,
            });
        },
        onSuccess: (_data, vars) => {
            toast.success(
                tCtrl("confirmDialogs.dispatchedToast", {
                    cmd: localizeResponseAction(vars.commandType, locale, true),
                })
            );
            setPendingConfirm(null);
            onToggleGotoPickMode(false);
            onChangeActivePopover(null);
            invalidateAllAfterCommand();
        },
        meta: { defaultErrorMessage: tCtrl("confirmDialogs.failedToast") },
    });

    const airborneButtons = useMemo(
        () => [
            {
                type: COMMAND_TYPE.HOVER,
                label: tCtrl("commands.hover"),
                icon: CircleDot,
                disabled: !c2Enabled || !isAirborne,
            },
            {
                type: COMMAND_TYPE.PAUSE,
                label: tCtrl("commands.pause"),
                icon: Pause,
                disabled: !c2Enabled || !isAirborne,
            },
            {
                type: COMMAND_TYPE.RESUME,
                label: tCtrl("commands.resume"),
                icon: Play,
                disabled: !c2Enabled || !isAirborne,
            },
            {
                type: COMMAND_TYPE.RTL,
                label: tCtrl("commands.rth"),
                icon: Home,
                disabled: !c2Enabled || !isAirborne,
                confirm: {
                    title: tCtrl("confirmDialogs.rthTitle"),
                    description: tCtrl("confirmDialogs.rthDesc"),
                    confirmText: tCtrl("confirmDialogs.rthBtn"),
                },
            },
            {
                type: COMMAND_TYPE.LAND,
                label: tCtrl("commands.land"),
                icon: PlaneLanding,
                disabled: !c2Enabled || !isAirborne,
                confirm: {
                    title: tCtrl("confirmDialogs.landTitle"),
                    description: tCtrl("confirmDialogs.landDesc"),
                    confirmText: tCtrl("confirmDialogs.landBtn"),
                },
            },
        ],
        [tCtrl, c2Enabled, isAirborne]
    );

    const adjustAltitudeBy = (delta: number) => {
        const base = Number.parseFloat(altitudeInput);
        const current = Number.isFinite(base)
            ? base
            : Math.round(telemetry?.altitude ?? flight.cruisingAltitudeM ?? 120);
        const maxCeiling = drone?.maxAltitude ?? 400;
        const clamped = Math.min(maxCeiling, Math.max(15, Math.round(current + delta)));
        setAltitudeInput(String(clamped));
    };

    const handleApplyAltitude = () => {
        const parsed = Number.parseFloat(altitudeInput);
        const maxCeiling = drone?.maxAltitude ?? 500;
        if (!Number.isFinite(parsed) || parsed < 10 || parsed > maxCeiling) {
            toast.error(t("invalidAltitudeRange", { max: Math.round(maxCeiling) }));
            return;
        }
        sendCommandMutation.mutate({
            commandType: COMMAND_TYPE.SET_ALTITUDE,
            parameters: JSON.stringify({ targetAltitude: Math.round(parsed * 10) / 10 }),
        });
    };

    const handleApplySpeed = () => {
        const parsed = Number.parseFloat(speedInput);
        const maxSpd = drone?.maxSpeed ?? 30;
        if (!Number.isFinite(parsed) || parsed < 2 || parsed > maxSpd) {
            toast.error(t("invalidSpeedRange", { max: Math.round(maxSpd) }));
            return;
        }
        sendCommandMutation.mutate({
            commandType: COMMAND_TYPE.CONFIGURE,
            parameters: JSON.stringify({ targetSpeedMps: Math.round(parsed * 10) / 10 }),
        });
    };

    const handleDispatchGoto = () => {
        if (!gotoDraft) return;
        const parsedAlt = Number.parseFloat(gotoAltInput);
        const maxCeiling = drone?.maxAltitude ?? 500;
        if (!Number.isFinite(parsedAlt) || parsedAlt < 10 || parsedAlt > maxCeiling) {
            toast.error(t("invalidAltitudeRange", { max: Math.round(maxCeiling) }));
            return;
        }
        sendCommandMutation.mutate({
            commandType: COMMAND_TYPE.GOTO,
            parameters: JSON.stringify({
                latitude: gotoDraft.latitude,
                longitude: gotoDraft.longitude,
                altitude: Math.round(parsedAlt * 10) / 10,
            }),
        });
    };

    const handleRequestDivert = () => {
        const targetHub = hubs.find((h) => h.id === divertHubId);
        if (
            targetHub?.location?.latitude === undefined ||
            targetHub.location.longitude === undefined
        ) {
            return;
        }
        const safeAlt = Math.max(40, Math.round(flight.cruisingAltitudeM ?? 80));
        setPendingConfirm({
            title: t("divertConfirmTitle"),
            description: t("divertConfirmDesc", {
                hub: targetHub.name || targetHub.code || targetHub.id,
            }),
            confirmText: t("divertBtn"),
            commandType: COMMAND_TYPE.GOTO,
            parameters: JSON.stringify({
                latitude: targetHub.location.latitude,
                longitude: targetHub.location.longitude,
                altitude: safeAlt,
                targetHubId: targetHub.id,
                reason: divertReason.trim() || undefined,
            }),
        });
    };

    const speedPreviewKmh = useMemo(() => {
        const v = Number.parseFloat(speedInput);
        return Number.isFinite(v) && v > 0 ? Math.round(v * 3.6) : null;
    }, [speedInput]);

    const toggleVectorPopover = (target: Exclude<VectorPopoverType, null>) => {
        const next = activePopover === target ? null : target;
        onChangeActivePopover(next);
        if (target === "goto" && next === "goto" && !gotoDraft) {
            onToggleGotoPickMode(true);
        } else if (next !== "goto" && gotoPickMode) {
            onToggleGotoPickMode(false);
        }
    };

    const isTakeoffPending =
        (sendCommandMutation.isPending &&
            sendCommandMutation.variables?.commandType === COMMAND_TYPE.TAKEOFF) ||
        activeCommandType === COMMAND_TYPE.TAKEOFF;

    return (
        <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-30 max-w-[calc(100vw-1.5rem)] flex flex-col items-center gap-2 pointer-events-auto">
            {!isControllableStatus && (
                <div className="px-3.5 py-2 rounded-md border border-slate-700 bg-slate-900/95 text-slate-200 text-xs font-mono shadow-xl backdrop-blur-md flex flex-wrap items-center justify-center gap-3">
                    <span>
                        {isTerminal ? t("postFlightReadOnlyNotice") : t("awaitingAuthNotice")}
                    </span>
                    <Link
                        href={`/dashboard/flights/${flight.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] no-underline shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                    >
                        <span>{isTerminal ? t("openReplayDossier") : t("exitToDossier")}</span>
                        <ArrowRight className="w-3 h-3" aria-hidden="true" />
                    </Link>
                </div>
            )}

            {activePopover && c2Enabled && isAirborne && (
                <div className="w-[calc(100vw-1.5rem)] sm:w-96 rounded-md border border-slate-700/90 bg-slate-900/95 p-3 text-slate-100 shadow-2xl backdrop-blur-md text-xs space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
                        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-200">
                            {activePopover === "alt"
                                ? t("targetAltitudeM")
                                : activePopover === "speed"
                                  ? t("targetSpeedMs")
                                  : activePopover === "goto"
                                    ? t("tacticalGotoTitle")
                                    : t("divertHubTitle")}
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                onChangeActivePopover(null);
                                onToggleGotoPickMode(false);
                            }}
                            aria-label={tc("close")}
                            className="w-6 h-6 rounded hover:bg-slate-800 inline-flex items-center justify-center text-slate-400 hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        >
                            <X className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                    </div>

                    {activePopover === "alt" && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                                {[-20, -10, 10, 20].map((step) => (
                                    <button
                                        key={step}
                                        type="button"
                                        onClick={() => adjustAltitudeBy(step)}
                                        className="flex-1 h-7 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 font-mono text-[11px] font-semibold text-slate-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                    >
                                        {step > 0 ? `+${step}` : step}m
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    aria-label={t("targetAltitudeM")}
                                    value={altitudeInput}
                                    onChange={(e) => setAltitudeInput(e.target.value)}
                                    className="flex-1 h-8 px-2.5 rounded border border-slate-700 bg-slate-800 text-white font-mono text-xs focus:outline-none focus:border-slate-500"
                                />
                                <button
                                    type="button"
                                    disabled={sendCommandMutation.isPending}
                                    onClick={handleApplyAltitude}
                                    className="chamfer-xs h-8 px-3 bg-white hover:bg-slate-200 text-slate-950 font-mono text-[11px] font-bold uppercase cursor-pointer disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                >
                                    {t("applyAlt")}
                                </button>
                            </div>
                        </div>
                    )}

                    {activePopover === "speed" && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                                {[8, 15, 22].map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setSpeedInput(String(preset))}
                                        className="flex-1 h-7 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 font-mono text-[11px] font-semibold text-slate-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                    >
                                        {preset} m/s
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        aria-label={t("targetSpeedMs")}
                                        value={speedInput}
                                        onChange={(e) => setSpeedInput(e.target.value)}
                                        className="w-full h-8 pl-2.5 pr-16 rounded border border-slate-700 bg-slate-800 text-white font-mono text-xs focus:outline-none focus:border-slate-500"
                                    />
                                    {speedPreviewKmh != null && (
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 pointer-events-none">
                                            {speedPreviewKmh} km/h
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    disabled={sendCommandMutation.isPending}
                                    onClick={handleApplySpeed}
                                    className="chamfer-xs h-8 px-3 bg-white hover:bg-slate-200 text-slate-950 font-mono text-[11px] font-bold uppercase cursor-pointer disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                >
                                    {t("applySpeed")}
                                </button>
                            </div>
                        </div>
                    )}

                    {activePopover === "goto" && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[11px] text-slate-300 tabular-nums">
                                    {gotoDraft
                                        ? `${gotoDraft.latitude.toFixed(5)}, ${gotoDraft.longitude.toFixed(5)}`
                                        : t("gotoHint")}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onToggleGotoPickMode(!gotoPickMode)}
                                    className={cn(
                                        "px-2 py-1 rounded text-[10px] font-mono font-bold inline-flex items-center gap-1 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                                        gotoPickMode
                                            ? "bg-amber-500 text-slate-950"
                                            : "border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                                    )}
                                >
                                    <Crosshair className="w-3 h-3" aria-hidden="true" />
                                    <span>{gotoPickMode ? t("pickingOnMap") : t("pickOnMap")}</span>
                                </button>
                            </div>

                            {gotoDraft && (
                                <div className="flex items-center gap-2 pt-1">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={gotoAltInput}
                                        onChange={(e) => {
                                            const raw = e.target.value;
                                            setGotoAltInput(raw);
                                            const v = Number.parseFloat(raw);
                                            if (Number.isFinite(v)) {
                                                onChangeGotoDraft({
                                                    ...gotoDraft,
                                                    altitude: v,
                                                });
                                            }
                                        }}
                                        aria-label={t("targetAltitudeM")}
                                        className="w-24 h-8 px-2 rounded border border-slate-700 bg-slate-800 text-white font-mono text-xs focus:outline-none focus:border-slate-500"
                                    />
                                    <span className="text-[11px] font-mono text-slate-400">
                                        m AGL
                                    </span>
                                    <button
                                        type="button"
                                        disabled={sendCommandMutation.isPending}
                                        onClick={handleDispatchGoto}
                                        className="chamfer-xs h-8 px-3 ml-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-[11px] font-bold uppercase cursor-pointer disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                                    >
                                        {t("flyToPoint")}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activePopover === "divert" && (
                        <div className="space-y-2">
                            <div className="text-slate-900">
                                <CustomSelect
                                    value={divertHubId}
                                    onValueChange={setDivertHubId}
                                    options={alternateHubOptions}
                                />
                            </div>
                            {divertHubId && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={divertReason}
                                        onChange={(e) => setDivertReason(e.target.value)}
                                        placeholder={t("divertReasonPlaceholder")}
                                        className="flex-1 h-8 px-2.5 rounded border border-slate-700 bg-slate-800 text-white text-xs focus:outline-none focus:border-slate-500"
                                    />
                                    <button
                                        type="button"
                                        disabled={sendCommandMutation.isPending}
                                        onClick={handleRequestDivert}
                                        className="chamfer-xs h-8 px-3 bg-white hover:bg-slate-200 text-slate-950 font-mono text-[11px] font-bold uppercase cursor-pointer shrink-0 disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                    >
                                        {t("divertBtn")}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {isControllableStatus && (
                <div
                    role="toolbar"
                    aria-label={t("quickManeuvers")}
                    className="max-w-[calc(100vw-1.5rem)] overflow-x-auto utm-scroll rounded-lg border border-slate-700/85 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-md flex items-center gap-1 whitespace-nowrap"
                >
                    {showPreTakeoffBar ? (
                        <>
                            <button
                                type="button"
                                disabled={!c2Enabled || sendCommandMutation.isPending}
                                onClick={() =>
                                    sendCommandMutation.mutate({
                                        commandType: COMMAND_TYPE.TAKEOFF,
                                    })
                                }
                                className="chamfer-xs h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-white inline-flex items-center gap-2 font-mono text-xs font-bold tracking-wider transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                            >
                                {isTakeoffPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                ) : (
                                    <PlaneTakeoff className="w-4 h-4" aria-hidden="true" />
                                )}
                                <span>{tCtrl("commands.tkof")}</span>
                            </button>

                            <span className="hidden sm:inline-flex px-2.5 text-[11px] font-mono text-slate-300 tabular-nums">
                                {t("launchReadyHint", {
                                    alt: Math.round(flight.cruisingAltitudeM ?? 120),
                                })}
                            </span>

                            <div
                                className="w-px h-6 bg-slate-700/85 mx-1 shrink-0"
                                aria-hidden="true"
                            />

                            <button
                                type="button"
                                disabled={!c2Enabled || sendCommandMutation.isPending}
                                onClick={() =>
                                    setPendingConfirm({
                                        title: tCtrl("confirmDialogs.estopTitle"),
                                        description: tCtrl("confirmDialogs.estopDesc"),
                                        confirmText: tCtrl("confirmDialogs.estopBtn"),
                                        commandType: COMMAND_TYPE.EMERGENCY_STOP,
                                    })
                                }
                                className="chamfer-xs h-9 px-3 bg-red-600 hover:bg-red-500 text-white inline-flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-wider transition-colors cursor-pointer shrink-0 disabled:opacity-35 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                            >
                                <OctagonAlert className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>{t("dockEstop")}</span>
                            </button>
                        </>
                    ) : (
                        <>
                            {airborneButtons.map((btn) => {
                                const Icon = btn.icon;
                                const isActive = activeCommandType === btn.type;
                                const isPendingThis =
                                    sendCommandMutation.isPending &&
                                    sendCommandMutation.variables?.commandType === btn.type;
                                return (
                                    <button
                                        key={btn.type}
                                        type="button"
                                        disabled={btn.disabled || sendCommandMutation.isPending}
                                        aria-pressed={isActive}
                                        onClick={() => {
                                            if (btn.confirm) {
                                                setPendingConfirm({
                                                    ...btn.confirm,
                                                    commandType: btn.type,
                                                });
                                            } else {
                                                sendCommandMutation.mutate({
                                                    commandType: btn.type,
                                                });
                                            }
                                        }}
                                        className={cn(
                                            "h-9 px-2.5 rounded inline-flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-wide transition-colors cursor-pointer shrink-0 disabled:opacity-35 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                                            isActive
                                                ? "bg-emerald-600 text-white"
                                                : "bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-slate-700/80"
                                        )}
                                    >
                                        {isPendingThis || isActive ? (
                                            <Loader2
                                                className="w-3.5 h-3.5 animate-spin"
                                                aria-hidden="true"
                                            />
                                        ) : (
                                            <Icon
                                                className="w-3.5 h-3.5 text-slate-300"
                                                aria-hidden="true"
                                            />
                                        )}
                                        <span>{btn.label}</span>
                                    </button>
                                );
                            })}

                            <div
                                className="w-px h-6 bg-slate-700/85 mx-0.5 shrink-0"
                                aria-hidden="true"
                            />

                            <button
                                type="button"
                                disabled={!c2Enabled || !isAirborne}
                                aria-pressed={activePopover === "alt"}
                                onClick={() => toggleVectorPopover("alt")}
                                className={cn(
                                    "h-9 px-2 rounded inline-flex items-center gap-1 font-mono text-[11px] font-semibold transition-colors cursor-pointer shrink-0 disabled:opacity-35 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                                    activePopover === "alt"
                                        ? "bg-slate-200 text-slate-950 font-bold"
                                        : "bg-slate-800/75 hover:bg-slate-700 text-slate-200 border border-slate-700/80"
                                )}
                            >
                                <ArrowUpDown className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>{t("dockAlt")}</span>
                            </button>

                            <button
                                type="button"
                                disabled={!c2Enabled || !isAirborne}
                                aria-pressed={activePopover === "speed"}
                                onClick={() => toggleVectorPopover("speed")}
                                className={cn(
                                    "h-9 px-2 rounded inline-flex items-center gap-1 font-mono text-[11px] font-semibold transition-colors cursor-pointer shrink-0 disabled:opacity-35 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                                    activePopover === "speed"
                                        ? "bg-slate-200 text-slate-950 font-bold"
                                        : "bg-slate-800/75 hover:bg-slate-700 text-slate-200 border border-slate-700/80"
                                )}
                            >
                                <Gauge className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>{t("dockSpeed")}</span>
                            </button>

                            <button
                                type="button"
                                disabled={!c2Enabled || !isAirborne}
                                aria-pressed={activePopover === "goto" || gotoPickMode}
                                onClick={() => toggleVectorPopover("goto")}
                                className={cn(
                                    "h-9 px-2 rounded inline-flex items-center gap-1 font-mono text-[11px] font-semibold transition-colors cursor-pointer shrink-0 disabled:opacity-35 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                                    activePopover === "goto" || gotoPickMode
                                        ? "bg-amber-500 text-slate-950 font-bold"
                                        : "bg-slate-800/75 hover:bg-slate-700 text-slate-200 border border-slate-700/80"
                                )}
                            >
                                <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>{t("dockGoto")}</span>
                            </button>

                            <button
                                type="button"
                                disabled={!c2Enabled || !isAirborne}
                                aria-pressed={activePopover === "divert"}
                                onClick={() => toggleVectorPopover("divert")}
                                className={cn(
                                    "h-9 px-2 rounded inline-flex items-center gap-1 font-mono text-[11px] font-semibold transition-colors cursor-pointer shrink-0 disabled:opacity-35 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                                    activePopover === "divert"
                                        ? "bg-slate-200 text-slate-950 font-bold"
                                        : "bg-slate-800/75 hover:bg-slate-700 text-slate-200 border border-slate-700/80"
                                )}
                            >
                                <CornerUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>{t("divertBtn")}</span>
                            </button>

                            <div
                                className="w-px h-6 bg-slate-700/85 mx-0.5 shrink-0"
                                aria-hidden="true"
                            />

                            <button
                                type="button"
                                disabled={!c2Enabled || sendCommandMutation.isPending}
                                onClick={() =>
                                    setPendingConfirm({
                                        title: tCtrl("confirmDialogs.estopTitle"),
                                        description: tCtrl("confirmDialogs.estopDesc"),
                                        confirmText: tCtrl("confirmDialogs.estopBtn"),
                                        commandType: COMMAND_TYPE.EMERGENCY_STOP,
                                    })
                                }
                                className="chamfer-xs h-9 px-2.5 bg-red-600 hover:bg-red-500 text-white inline-flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-wider transition-colors cursor-pointer shrink-0 disabled:opacity-35 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                            >
                                <OctagonAlert className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>{t("dockEstop")}</span>
                            </button>
                        </>
                    )}
                </div>
            )}

            <ConfirmDialog
                isOpen={Boolean(pendingConfirm)}
                onClose={() => setPendingConfirm(null)}
                onConfirm={() => {
                    if (pendingConfirm) {
                        sendCommandMutation.mutate({
                            commandType: pendingConfirm.commandType,
                            parameters: pendingConfirm.parameters,
                        });
                    }
                }}
                title={pendingConfirm?.title ?? tCtrl("confirmDialogs.defaultTitle")}
                description={pendingConfirm?.description ?? ""}
                confirmText={pendingConfirm?.confirmText ?? tc("confirm")}
                loading={sendCommandMutation.isPending}
            />
        </div>
    );
});

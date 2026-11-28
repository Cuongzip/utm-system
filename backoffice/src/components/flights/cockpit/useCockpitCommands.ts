"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleDot, Home, Pause, PlaneLanding, Play, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import type { SelectOption } from "@/components/ui";
import { droneService } from "@/services";
import { QUERY_KEYS, useFlightCommands } from "@/hooks";
import { useAppLocale } from "@/i18n";
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

export interface PendingConfirmState {
    title: string;
    description: string;
    confirmText: string;
    commandType: CommandType;
    parameters?: string;
}

export interface AirborneCommandButton {
    type: CommandType;
    label: string;
    icon: LucideIcon;
    disabled: boolean;
    confirm?: {
        title: string;
        description: string;
        confirmText: string;
    };
}

interface UseCockpitCommandsParams {
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

export function useCockpitCommands({
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
}: UseCockpitCommandsParams) {
    const t = useTranslations("flights.deck");
    const tCtrl = useTranslations("controlCenter");
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

    const airborneButtons = useMemo<AirborneCommandButton[]>(
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

    const handleGotoAltInputChange = (raw: string) => {
        setGotoAltInput(raw);
        if (!gotoDraft) return;
        const v = Number.parseFloat(raw);
        if (Number.isFinite(v)) {
            onChangeGotoDraft({
                ...gotoDraft,
                altitude: v,
            });
        }
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

    return {
        isControllableStatus,
        isTerminal,
        isAirborne,
        c2Enabled,
        showPreTakeoffBar,
        altitudeInput,
        setAltitudeInput,
        speedInput,
        setSpeedInput,
        divertHubId,
        setDivertHubId,
        divertReason,
        setDivertReason,
        pendingConfirm,
        setPendingConfirm,
        gotoAltInput,
        handleGotoAltInputChange,
        activeCommandType,
        alternateHubOptions,
        sendCommandMutation,
        airborneButtons,
        adjustAltitudeBy,
        handleApplyAltitude,
        handleApplySpeed,
        handleDispatchGoto,
        handleRequestDivert,
        speedPreviewKmh,
        toggleVectorPopover,
        isTakeoffPending,
    };
}

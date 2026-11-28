"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
    PlaneTakeoff,
    PlaneLanding,
    Home,
    Pause,
    CircleDot,
    Play,
    OctagonAlert,
    Loader2,
} from "lucide-react";
import { ChamferCard, ConfirmDialog } from "@/components/ui";
import { droneService } from "@/services";
import { QUERY_KEYS, useDroneCommands } from "@/hooks";
import { useAppLocale } from "@/i18n";
import { cn } from "@/lib";
import { localizeResponseAction } from "@/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    ACTIVE_FLIGHT_STATUSES,
    COMMAND_TYPE,
    FLIGHT_STATUS,
    IN_PROGRESS_COMMAND_STATUSES,
    type CommandType,
    type FlightStatus,
} from "@/types";

interface FlightControlProps {
    droneId?: string | null;
    flightId?: string | null;
    flightStatus?: FlightStatus | null;
    altitudeM?: number | null;
    hasLiveLink?: boolean;
}

interface CommandActionConfig {
    type: CommandType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    confirmTitle?: string;
    confirmDescription?: string;
    confirmText?: string;
}

export function FlightControl({
    droneId,
    flightId,
    flightStatus,
    altitudeM,
    hasLiveLink,
}: FlightControlProps) {
    const t = useTranslations("controlCenter");
    const tc = useTranslations("common");
    const locale = useAppLocale();
    const queryClient = useQueryClient();
    const [pendingConfirm, setPendingConfirm] = useState<CommandActionConfig | null>(null);
    const { data: commandList } = useDroneCommands(droneId);

    const activeCommandType = useMemo(() => {
        const items = commandList?.items ?? [];
        const running = items.find(
            (cmd) =>
                cmd.status != null &&
                IN_PROGRESS_COMMAND_STATUSES.includes(cmd.status.toLowerCase())
        );
        return running?.commandType ? running.commandType.toLowerCase() : null;
    }, [commandList]);

    const gridCommands: CommandActionConfig[] = useMemo(
        () => [
            {
                type: COMMAND_TYPE.TAKEOFF,
                label: t("commands.tkof"),
                icon: PlaneTakeoff,
            },
            {
                type: COMMAND_TYPE.LAND,
                label: t("commands.land"),
                icon: PlaneLanding,
                confirmTitle: t("confirmDialogs.landTitle"),
                confirmDescription: t("confirmDialogs.landDesc"),
                confirmText: t("confirmDialogs.landBtn"),
            },
            {
                type: COMMAND_TYPE.RTL,
                label: t("commands.rth"),
                icon: Home,
                confirmTitle: t("confirmDialogs.rthTitle"),
                confirmDescription: t("confirmDialogs.rthDesc"),
                confirmText: t("confirmDialogs.rthBtn"),
            },
            {
                type: COMMAND_TYPE.PAUSE,
                label: t("commands.pause"),
                icon: Pause,
            },
            {
                type: COMMAND_TYPE.HOVER,
                label: t("commands.hover"),
                icon: CircleDot,
            },
            {
                type: COMMAND_TYPE.RESUME,
                label: t("commands.resume"),
                icon: Play,
            },
        ],
        [t]
    );

    const emergencyStopConfig: CommandActionConfig = useMemo(
        () => ({
            type: COMMAND_TYPE.EMERGENCY_STOP,
            label: t("commands.emergencyStop"),
            icon: OctagonAlert,
            confirmTitle: t("confirmDialogs.estopTitle"),
            confirmDescription: t("confirmDialogs.estopDesc"),
            confirmText: t("confirmDialogs.estopBtn"),
        }),
        [t]
    );

    const sendCommandMutation = useMutation({
        mutationFn: async (commandType: CommandType) => {
            if (!droneId) {
                throw new Error(t("disabledReasons.selectAircraft"));
            }
            return droneService.sendCommand(droneId, {
                commandType,
                flightId: flightId || undefined,
            });
        },
        onSuccess: (_data, type) => {
            toast.success(
                t("confirmDialogs.dispatchedToast", {
                    cmd: localizeResponseAction(type, locale, true),
                })
            );
            setPendingConfirm(null);
            if (droneId) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.droneCommands(droneId) });
            }
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightsAll });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dronesAll });
        },
        meta: { defaultErrorMessage: t("confirmDialogs.failedToast") },
    });

    const isAvailable = Boolean(droneId);
    const isPhysicallyAirborne = Boolean(altitudeM != null && altitudeM > 1.5);
    const isFlightActive = Boolean(flightStatus && ACTIVE_FLIGHT_STATUSES.includes(flightStatus));
    const isAirborne = isFlightActive || isPhysicallyAirborne;

    const getDisabledReason = (commandType: CommandType): string | null => {
        if (!isAvailable) return t("disabledReasons.selectAircraft");
        if (commandType === COMMAND_TYPE.TAKEOFF) {
            if (isPhysicallyAirborne) {
                return t("disabledReasons.alreadyAirborne");
            }
            if (flightStatus && flightStatus !== FLIGHT_STATUS.AUTHORIZED && !isFlightActive) {
                return t("disabledReasons.notDeparted");
            }
            return null;
        }
        if (!isAirborne) {
            return t("disabledReasons.notDeparted");
        }
        return null;
    };

    const handleTriggerCommand = (action: CommandActionConfig) => {
        if (action.confirmTitle) {
            setPendingConfirm(action);
            return;
        }
        sendCommandMutation.mutate(action.type);
    };

    const isEstopExecuting =
        sendCommandMutation.isPending && sendCommandMutation.variables === emergencyStopConfig.type;

    const statusIndicator = !isAvailable
        ? t("noTarget")
        : flightStatus === FLIGHT_STATUS.AUTHORIZED
          ? t("readyForTakeoff")
          : hasLiveLink === false
            ? t("linkStandby")
            : t("c2Armed");

    return (
        <>
            <ChamferCard size="lg" className="h-[272px]">
                <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center justify-between gap-3 shrink-0">
                    <span className="text-xs font-bold text-[var(--color-text-primary)] font-mono tracking-wider uppercase truncate">
                        {t("flightControl")}
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-slate-400 shrink-0">
                        {statusIndicator}
                    </span>
                </div>
                <div className="p-4 pt-3.5 flex flex-col justify-between flex-1 min-h-0">
                    <div className="grid grid-cols-3 gap-px bg-[var(--color-border-default)] border border-[var(--color-border-default)] rounded-md overflow-hidden">
                        {gridCommands.map((action) => {
                            const Icon = action.icon;
                            const isDispatching =
                                sendCommandMutation.isPending &&
                                sendCommandMutation.variables === action.type;
                            const isCommandActive = activeCommandType === action.type;
                            const disabledReason = getDisabledReason(action.type);
                            const isDisabled =
                                Boolean(disabledReason) || sendCommandMutation.isPending;

                            return (
                                <button
                                    key={action.type}
                                    type="button"
                                    disabled={isDisabled}
                                    aria-pressed={isCommandActive}
                                    title={
                                        disabledReason ??
                                        t("disabledReasons.dispatchCmd", { label: action.label })
                                    }
                                    onClick={() => handleTriggerCommand(action)}
                                    className={cn(
                                        "h-[62px] px-1 flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400",
                                        isCommandActive
                                            ? "bg-slate-900 text-white hover:bg-slate-800"
                                            : "bg-[var(--color-surface-panel)] hover:bg-slate-100 active:bg-slate-200/70 text-slate-900 disabled:hover:bg-slate-50"
                                    )}
                                >
                                    {isDispatching || isCommandActive ? (
                                        <Loader2
                                            className={cn(
                                                "h-4 w-4 animate-spin",
                                                isCommandActive ? "text-white" : "text-slate-600"
                                            )}
                                            aria-hidden="true"
                                        />
                                    ) : (
                                        <Icon
                                            className={cn(
                                                "h-4 w-4",
                                                isDisabled ? "text-slate-400" : "text-slate-700"
                                            )}
                                            aria-hidden="true"
                                        />
                                    )}
                                    <span className="text-[11px] font-bold font-mono tracking-wide leading-tight truncate max-w-full">
                                        {action.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        disabled={!isAvailable || sendCommandMutation.isPending}
                        onClick={() => handleTriggerCommand(emergencyStopConfig)}
                        className="chamfer-sm w-full h-9 bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2 text-xs font-bold font-mono tracking-wider transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    >
                        {isEstopExecuting ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                            <OctagonAlert className="h-4 w-4" aria-hidden="true" />
                        )}
                        <span>{emergencyStopConfig.label}</span>
                    </button>
                </div>
            </ChamferCard>

            <ConfirmDialog
                isOpen={Boolean(pendingConfirm)}
                onClose={() => setPendingConfirm(null)}
                onConfirm={() => {
                    if (pendingConfirm) {
                        sendCommandMutation.mutate(pendingConfirm.type);
                    }
                }}
                title={pendingConfirm?.confirmTitle ?? t("confirmDialogs.defaultTitle")}
                description={pendingConfirm?.confirmDescription ?? ""}
                confirmText={pendingConfirm?.confirmText ?? tc("confirm")}
                loading={sendCommandMutation.isPending}
            />
        </>
    );
}

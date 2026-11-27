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
import { QUERY_KEYS } from "@/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ACTIVE_FLIGHT_STATUSES, COMMAND_TYPE, type CommandType, type FlightStatus } from "@/types";

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
    const queryClient = useQueryClient();
    const [pendingConfirm, setPendingConfirm] = useState<CommandActionConfig | null>(null);

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
                    cmd: type.replace(/_/g, " ").toUpperCase(),
                })
            );
            setPendingConfirm(null);
            if (droneId) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.droneCommands(droneId) });
            }
        },
        meta: { defaultErrorMessage: t("confirmDialogs.failedToast") },
    });

    const isAvailable = Boolean(droneId);
    const isAirborne = Boolean(
        (flightStatus && ACTIVE_FLIGHT_STATUSES.includes(flightStatus)) ||
        (altitudeM != null && altitudeM > 2)
    );
    const isGroundedPreFlight = Boolean(
        !isAirborne && flightStatus && !ACTIVE_FLIGHT_STATUSES.includes(flightStatus)
    );

    const getDisabledReason = (commandType: CommandType): string | null => {
        if (!isAvailable) return t("disabledReasons.selectAircraft");
        if (commandType === COMMAND_TYPE.TAKEOFF && isAirborne) {
            return t("disabledReasons.alreadyAirborne");
        }
        if (commandType !== COMMAND_TYPE.TAKEOFF && isGroundedPreFlight) {
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
                            const isExecuting =
                                sendCommandMutation.isPending &&
                                sendCommandMutation.variables === action.type;
                            const disabledReason = getDisabledReason(action.type);
                            const isDisabled =
                                Boolean(disabledReason) || sendCommandMutation.isPending;

                            return (
                                <button
                                    key={action.type}
                                    type="button"
                                    disabled={isDisabled}
                                    title={
                                        disabledReason ??
                                        t("disabledReasons.dispatchCmd", { label: action.label })
                                    }
                                    onClick={() => handleTriggerCommand(action)}
                                    className="h-[62px] px-1 bg-[var(--color-surface-panel)] hover:bg-slate-100 active:bg-slate-200/70 text-slate-800 flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-35 disabled:hover:bg-[var(--color-surface-panel)] disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400"
                                >
                                    {isExecuting ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
                                    ) : (
                                        <Icon className="h-4 w-4 text-slate-600" />
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
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <OctagonAlert className="h-4 w-4" />
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

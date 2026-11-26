"use client";

import { useState } from "react";
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

const GRID_COMMANDS: readonly CommandActionConfig[] = [
    {
        type: COMMAND_TYPE.TAKEOFF,
        label: "TKOF",
        icon: PlaneTakeoff,
    },
    {
        type: COMMAND_TYPE.LAND,
        label: "LAND",
        icon: PlaneLanding,
        confirmTitle: "Confirm Immediate Landing",
        confirmDescription:
            "Instruct the selected aircraft to initiate vertical descent and land at its current GPS coordinates immediately.",
        confirmText: "Execute Land",
    },
    {
        type: COMMAND_TYPE.RTL,
        label: "RTH",
        icon: Home,
        confirmTitle: "Confirm Return to Home (RTH)",
        confirmDescription:
            "Abort current route progress and command the aircraft to return directly to its assigned home vertiport.",
        confirmText: "Execute RTH",
    },
    {
        type: COMMAND_TYPE.PAUSE,
        label: "PAUSE",
        icon: Pause,
    },
    {
        type: COMMAND_TYPE.HOVER,
        label: "HOVER",
        icon: CircleDot,
    },
    {
        type: COMMAND_TYPE.RESUME,
        label: "RESUME",
        icon: Play,
    },
];

const EMERGENCY_STOP_CONFIG: CommandActionConfig = {
    type: COMMAND_TYPE.EMERGENCY_STOP,
    label: "EMERGENCY STOP",
    icon: OctagonAlert,
    confirmTitle: "Confirm Emergency Stop (ESTOP)",
    confirmDescription:
        "CRITICAL SAFETY ACTION: This will trigger an immediate emergency flight termination / failsafe stop on the active aircraft. Proceed only if an unrecoverable hazard is imminent.",
    confirmText: "Dispatch ESTOP",
};

export function FlightControl({
    droneId,
    flightId,
    flightStatus,
    altitudeM,
    hasLiveLink,
}: FlightControlProps) {
    const queryClient = useQueryClient();
    const [pendingConfirm, setPendingConfirm] = useState<CommandActionConfig | null>(null);

    const sendCommandMutation = useMutation({
        mutationFn: async (commandType: CommandType) => {
            if (!droneId) {
                throw new Error("No active drone selected");
            }
            return droneService.sendCommand(droneId, {
                commandType,
                flightId: flightId || undefined,
            });
        },
        onSuccess: (_data, type) => {
            toast.success(`Dispatched ${type.toUpperCase()} command successfully`);
            setPendingConfirm(null);
            if (droneId) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.droneCommands(droneId) });
            }
        },
        meta: { defaultErrorMessage: "Failed to dispatch command" },
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
        if (!isAvailable) return "Select an active aircraft first";
        if (commandType === COMMAND_TYPE.TAKEOFF && isAirborne) {
            return "Takeoff disabled while aircraft is already airborne";
        }
        if (commandType !== COMMAND_TYPE.TAKEOFF && isGroundedPreFlight) {
            return "In-flight command disabled while aircraft has not departed";
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
        sendCommandMutation.isPending &&
        sendCommandMutation.variables === EMERGENCY_STOP_CONFIG.type;

    const statusIndicator = !isAvailable
        ? "NO TARGET"
        : hasLiveLink === false
          ? "LINK STANDBY"
          : "C2 ARMED";

    return (
        <>
            <ChamferCard size="lg" className="h-[272px]">
                <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center justify-between gap-3 shrink-0">
                    <span className="text-xs font-bold text-[var(--color-text-primary)] font-mono tracking-wider uppercase">
                        FLIGHT CONTROL
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-slate-400">
                        {statusIndicator}
                    </span>
                </div>
                <div className="p-4 pt-3.5 flex flex-col justify-between flex-1 min-h-0">
                    <div className="grid grid-cols-3 gap-px bg-[var(--color-border-default)] border border-[var(--color-border-default)] rounded-md overflow-hidden">
                        {GRID_COMMANDS.map((action) => {
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
                                    title={disabledReason ?? `Dispatch ${action.label}`}
                                    onClick={() => handleTriggerCommand(action)}
                                    className="h-[62px] bg-[var(--color-surface-panel)] hover:bg-slate-100 active:bg-slate-200/70 text-slate-800 flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-35 disabled:hover:bg-[var(--color-surface-panel)] disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400"
                                >
                                    {isExecuting ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
                                    ) : (
                                        <Icon className="h-4 w-4 text-slate-600" />
                                    )}
                                    <span className="text-[11px] font-bold font-mono tracking-wider leading-none">
                                        {action.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        disabled={!isAvailable || sendCommandMutation.isPending}
                        onClick={() => handleTriggerCommand(EMERGENCY_STOP_CONFIG)}
                        className="chamfer-sm w-full h-9 bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2 text-xs font-bold font-mono tracking-wider transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    >
                        {isEstopExecuting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <OctagonAlert className="h-4 w-4" />
                        )}
                        <span>{EMERGENCY_STOP_CONFIG.label}</span>
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
                title={pendingConfirm?.confirmTitle ?? "Confirm Flight Command"}
                description={pendingConfirm?.confirmDescription ?? ""}
                confirmText={pendingConfirm?.confirmText ?? "Confirm"}
                loading={sendCommandMutation.isPending}
            />
        </>
    );
}

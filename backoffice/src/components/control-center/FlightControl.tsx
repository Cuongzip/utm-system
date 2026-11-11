"use client";

import { PlaneTakeoff, PlaneLanding, Home, Loader2, AlertCircle } from "lucide-react";
import { ChamferCard } from "@/components/ui";
import { droneService } from "@/services";
import { QUERY_KEYS } from "@/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { type CommandType, COMMAND_TYPE } from "@/types";

interface FlightControlProps {
    droneId?: string | null;
    flightId?: string | null;
}

const COMMAND_ACTIONS = [
    {
        type: COMMAND_TYPE.TAKEOFF,
        label: "TKOF",
        icon: PlaneTakeoff,
        className: "bg-slate-800 hover:bg-slate-700 text-white",
        iconColor: "text-white",
    },
    {
        type: COMMAND_TYPE.LAND,
        label: "LAND",
        icon: PlaneLanding,
        className: "bg-slate-50 hover:bg-slate-100 text-slate-800",
        iconColor: "text-slate-600",
    },
    {
        type: COMMAND_TYPE.RTL,
        label: "RTH",
        icon: Home,
        className: "bg-slate-50 hover:bg-slate-100 text-slate-800",
        iconColor: "text-slate-600",
    },
] as const;

export function FlightControl({ droneId, flightId }: FlightControlProps) {
    const queryClient = useQueryClient();

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
            toast.success(`Dispatched ${type} command successfully`);
            if (droneId) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.droneCommands(droneId) });
            }
        },
        meta: { defaultErrorMessage: "Failed to dispatch command" },
    });

    const isAvailable = Boolean(droneId);

    return (
        <ChamferCard size="lg" className="h-[273px]">
            <div className="p-4 flex flex-col justify-between h-full">
                <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 font-mono tracking-wider">
                            <PlaneTakeoff className="h-4 w-4 text-slate-600" />
                            <span>FLIGHT CONTROL</span>
                        </div>
                        {!isAvailable && (
                            <span className="flex items-center text-[10px] text-amber-600 font-mono">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Standby
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-4">
                        {COMMAND_ACTIONS.map(
                            ({ type, label, icon: Icon, className, iconColor }) => {
                                const isExecuting =
                                    sendCommandMutation.isPending &&
                                    sendCommandMutation.variables === type;
                                return (
                                    <ChamferCard key={type} size="md">
                                        <button
                                            type="button"
                                            disabled={!isAvailable || sendCommandMutation.isPending}
                                            onClick={() => sendCommandMutation.mutate(type)}
                                            className={`w-full h-28 flex flex-col items-center justify-center p-2 disabled:opacity-50 shadow-xs transition-colors group cursor-pointer disabled:cursor-not-allowed border-none ${className}`}
                                        >
                                            {isExecuting ? (
                                                <Loader2
                                                    className={`h-5 w-5 mb-2 animate-spin ${iconColor}`}
                                                />
                                            ) : (
                                                <Icon
                                                    className={`h-5 w-5 mb-2 ${iconColor} group-hover:-translate-y-0.5 transition-transform`}
                                                />
                                            )}
                                            <span className="text-sm font-bold font-mono tracking-wider">
                                                {label}
                                            </span>
                                        </button>
                                    </ChamferCard>
                                );
                            }
                        )}
                    </div>
                </div>
            </div>
        </ChamferCard>
    );
}

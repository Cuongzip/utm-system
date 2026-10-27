"use client";

import { useState } from "react";
import { PlaneTakeoff, PlaneLanding, Home, Loader2, AlertCircle } from "lucide-react";
import { ChamferCard } from "@/components/ui";
import { droneService } from "@/services";
import { QUERY_KEYS } from "@/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CommandType } from "@/types";

interface FlightControlProps {
    droneId?: string | null;
    flightId?: string | null;
    uavId?: string;
    statusText?: string;
}

export function FlightControl({
    droneId,
    flightId,
    uavId = "UAV-STANDBY",
    statusText = "Ready for control",
}: FlightControlProps) {
    const queryClient = useQueryClient();
    const [executingType, setExecutingType] = useState<CommandType | null>(null);

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
        onMutate: (type) => {
            setExecutingType(type);
        },
        onSuccess: (_data, type) => {
            toast.success(`Dispatched ${type} command successfully`);
            if (droneId) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.droneCommands(droneId) });
            }
        },
        onError: (err: Error) => {
            toast.error(err.message || "Failed to dispatch command");
        },
        onSettled: () => {
            setExecutingType(null);
        },
    });

    const isAvailable = Boolean(droneId);

    const handleCommand = (type: CommandType) => {
        if (!isAvailable) {
            toast.error("Please select an active flight/drone to dispatch commands");
            return;
        }
        sendCommandMutation.mutate(type);
    };

    return (
        <ChamferCard size="lg" className="h-[273px]">
            <div className="p-4 flex flex-col justify-between h-full">
                <div>
                    <div className="flex items-center justify-between">
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
                    <p className="text-[11px] text-slate-500 font-mono mt-1 truncate">
                        {uavId} • {statusText}
                    </p>

                    <div className="grid grid-cols-3 gap-3 mt-4">
                        <ChamferCard size="md" className="bg-[#94a3b8]">
                            <button
                                type="button"
                                disabled={!isAvailable || sendCommandMutation.isPending}
                                onClick={() => handleCommand("TAKEOFF")}
                                className="w-full h-28 flex flex-col items-center justify-center p-2 bg-[#475569] hover:bg-[#334155] disabled:opacity-60 disabled:hover:bg-[#475569] text-white shadow-xs transition-colors group cursor-pointer disabled:cursor-not-allowed border-none"
                            >
                                {executingType?.toLowerCase() === "takeoff" ? (
                                    <Loader2 className="h-5 w-5 mb-2 animate-spin text-white" />
                                ) : (
                                    <PlaneTakeoff className="h-5 w-5 mb-2 group-hover:-translate-y-0.5 transition-transform text-white" />
                                )}
                                <span className="text-xs font-bold font-mono">Takeoff</span>
                                <span className="text-[9px] text-[#e2e8f0] font-sans mt-0.5">
                                    Initiate takeoff
                                </span>
                            </button>
                        </ChamferCard>

                        <ChamferCard size="md">
                            <button
                                type="button"
                                disabled={!isAvailable || sendCommandMutation.isPending}
                                onClick={() => handleCommand("land")}
                                className="w-full h-28 flex flex-col items-center justify-center p-2 bg-[#f8fafc] hover:bg-slate-100 disabled:opacity-60 text-[#334155] transition-colors group cursor-pointer disabled:cursor-not-allowed border-none"
                            >
                                {executingType?.toLowerCase() === "land" ? (
                                    <Loader2 className="h-5 w-5 mb-2 animate-spin text-slate-600" />
                                ) : (
                                    <PlaneLanding className="h-5 w-5 text-slate-600 mb-2 group-hover:translate-y-0.5 transition-transform" />
                                )}
                                <span className="text-xs font-bold font-mono">Land</span>
                                <span className="text-[9px] text-[#94a3b8] font-sans mt-0.5">
                                    Return and land
                                </span>
                            </button>
                        </ChamferCard>

                        <ChamferCard size="md">
                            <button
                                type="button"
                                disabled={!isAvailable || sendCommandMutation.isPending}
                                onClick={() => handleCommand("rtl")}
                                className="w-full h-28 flex flex-col items-center justify-center p-2 bg-[#f8fafc] hover:bg-slate-100 disabled:opacity-60 text-[#334155] transition-colors group cursor-pointer disabled:cursor-not-allowed border-none"
                            >
                                {executingType?.toLowerCase() === "rtl" ? (
                                    <Loader2 className="h-5 w-5 mb-2 animate-spin text-slate-600" />
                                ) : (
                                    <Home className="h-5 w-5 text-slate-600 mb-2" />
                                )}
                                <span className="text-xs font-bold font-mono leading-tight text-center">
                                    Return to Home
                                </span>
                                <span className="text-[9px] text-[#94a3b8] font-sans mt-0.5">
                                    RTH
                                </span>
                            </button>
                        </ChamferCard>
                    </div>
                </div>
            </div>
        </ChamferCard>
    );
}

export default FlightControl;

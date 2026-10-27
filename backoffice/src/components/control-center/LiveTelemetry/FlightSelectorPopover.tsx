"use client";

import { Drone, ChevronRight, RefreshCw, Plane, Check } from "lucide-react";
import {
    ChamferCard,
    StatusBadge,
    Popover,
    PopoverContent,
    PopoverTrigger,
    EmptyState,
} from "@/components/ui";
import type { Flight, TelemetryRecord } from "@/types";

export interface FlightSelectorPopoverProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    flight?: Flight | null;
    flights?: Flight[];
    selectedFlightId?: string | null;
    onSelectFlight?: (flightId: string) => void;
    telemetryMap?: Record<string, TelemetryRecord>;
    onReloadFlights?: () => void;
    hasAlert?: boolean;
    serialNumber?: string;
    uavId?: string;
}

export function FlightSelectorPopover({
    isOpen,
    onOpenChange,
    flight,
    flights = [],
    selectedFlightId,
    onSelectFlight,
    telemetryMap = {},
    onReloadFlights,
    hasAlert = false,
    serialNumber = "—",
    uavId = "STANDBY",
}: FlightSelectorPopoverProps) {
    return (
        <Popover open={isOpen} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="w-full mt-3 text-left cursor-pointer focus:outline-none"
                >
                    <ChamferCard
                        size="md"
                        className={`transition-all ${isOpen ? "ring-2 ring-cyan-500/50" : "hover:opacity-95"}`}
                    >
                        <div className="p-3 bg-slate-50 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-9 h-9 chamfer-sm bg-white border border-slate-300 flex items-center justify-center text-slate-700 shadow-2xs">
                                    <Drone className="h-4 w-4 text-slate-700" />
                                </div>
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs font-bold font-mono text-slate-900">
                                            {uavId}
                                        </span>
                                        {hasAlert && <StatusBadge status="alert" label="ALERT" />}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                        {flight
                                            ? `Flight ${flight.flightNumber || flight.id.slice(0, 8)}`
                                            : "No Active Flight"}{" "}
                                        • SN: {serialNumber}
                                    </div>
                                </div>
                            </div>
                            <ChevronRight
                                className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-90 text-slate-700" : ""}`}
                            />
                        </div>
                    </ChamferCard>
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                sideOffset={6}
                className="w-[340px] p-0 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden font-mono text-xs z-[9999]"
            >
                <div className="p-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Select Active Flight ({flights.length})
                    </span>
                    {onReloadFlights && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onReloadFlights();
                            }}
                            title="Reload flights"
                            className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200 cursor-pointer"
                        >
                            <RefreshCw className="h-3 w-3" />
                        </button>
                    )}
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 p-1">
                    {flights.length === 0 ? (
                        <EmptyState
                            compact
                            icon={Drone}
                            title="No active flights"
                            description="No airborne drones transmitting telemetry"
                            className="py-5"
                        />
                    ) : (
                        flights.map((item) => {
                            const isSelected = item.id === (flight?.id || selectedFlightId);
                            const hasLiveTelemetry = !!telemetryMap[item.id];
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        onSelectFlight?.(item.id);
                                        onOpenChange(false);
                                    }}
                                    className={`w-full flex items-center justify-between p-2.5 rounded-md text-left transition-colors cursor-pointer ${
                                        isSelected
                                            ? "bg-slate-900 text-white"
                                            : "hover:bg-slate-50 text-slate-800"
                                    }`}
                                >
                                    <div className="flex items-center space-x-2.5 min-w-0">
                                        <Plane
                                            className={`h-4 w-4 shrink-0 ${hasLiveTelemetry ? "text-emerald-500" : isSelected ? "text-cyan-400" : "text-slate-400"}`}
                                        />
                                        <div className="truncate">
                                            <div className="flex items-center space-x-2">
                                                <span className="font-bold text-xs">
                                                    {item.flightNumber || item.id.slice(0, 8)}
                                                </span>
                                                {hasLiveTelemetry && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping" />
                                                )}
                                            </div>
                                            <div
                                                className={`text-[10px] truncate ${isSelected ? "text-slate-300" : "text-slate-500"}`}
                                            >
                                                {item.droneId
                                                    ? `SN: ${item.droneId.slice(0, 8)}`
                                                    : "No Drone"}{" "}
                                                • {(item.status || "ready").toUpperCase()}
                                            </div>
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <Check className="h-4 w-4 text-cyan-400 shrink-0 ml-2" />
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

export default FlightSelectorPopover;

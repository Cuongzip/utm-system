"use client";

import { Drone, ChevronRight, Plane, Check } from "lucide-react";
import {
    ChamferCard,
    StatusBadge,
    Popover,
    PopoverContent,
    PopoverTrigger,
    EmptyState,
} from "@/components/ui";
import { cn } from "@/lib";
import { type Flight, type TelemetryRecord, DEFAULT_FLIGHT_STATUS } from "@/types";

export interface FlightSelectorPopoverProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    flight?: Flight | null;
    flights?: Flight[];
    selectedFlightId?: string | null;
    onSelectFlight?: (flightId: string) => void;
    telemetryMap?: Record<string, TelemetryRecord>;
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
                style={{ width: "var(--radix-popover-trigger-width)" }}
                className="w-[var(--radix-popover-trigger-width)] p-0 bg-transparent border-none shadow-none rounded-none outline-none font-mono text-xs z-[9999]"
            >
                <ChamferCard size="md" className="w-full drop-shadow-xl">
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 p-1.5 custom-scrollbar">
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
                                        className={cn(
                                            "w-full flex items-center justify-between p-2.5 chamfer-sm text-left transition-colors cursor-pointer",
                                            isSelected ? "text-slate-900" : "text-slate-700",
                                            "hover:bg-slate-100/70"
                                        )}
                                    >
                                        <div className="flex items-center space-x-2.5 min-w-0">
                                            <Plane
                                                className={cn(
                                                    "h-4 w-4 shrink-0",
                                                    hasLiveTelemetry
                                                        ? "text-emerald-500"
                                                        : isSelected
                                                          ? "text-cyan-600"
                                                          : "text-slate-400"
                                                )}
                                            />
                                            <div className="truncate">
                                                <div className="flex items-center space-x-2">
                                                    <span
                                                        className={cn(
                                                            "text-xs",
                                                            isSelected
                                                                ? "font-bold text-slate-900"
                                                                : "font-semibold text-slate-800"
                                                        )}
                                                    >
                                                        {item.flightNumber || item.id.slice(0, 8)}
                                                    </span>
                                                    {hasLiveTelemetry && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0" />
                                                    )}
                                                </div>
                                                <div className="text-[10px] truncate text-slate-500">
                                                    {item.droneId
                                                        ? `SN: ${item.droneId.slice(0, 8)}`
                                                        : "No Drone"}{" "}
                                                    •{" "}
                                                    {(
                                                        item.status ?? DEFAULT_FLIGHT_STATUS
                                                    ).toUpperCase()}
                                                </div>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <Check className="h-4 w-4 text-cyan-600 shrink-0 ml-2 stroke-[2.5]" />
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </ChamferCard>
            </PopoverContent>
        </Popover>
    );
}

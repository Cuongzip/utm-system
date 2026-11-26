"use client";

import { Drone, ChevronDown, Plane, Check } from "lucide-react";
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
    flight: Flight | null;
    flights: Flight[];
    droneRegMap?: Map<string, string>;
    selectedFlightId: string | null;
    onSelectFlight: (flightId: string) => void;
    telemetryMap: Record<string, TelemetryRecord>;
    hasAlert: boolean;
    droneRegistration: string;
    uavId: string;
}

export function FlightSelectorPopover({
    isOpen,
    onOpenChange,
    flight,
    flights = [],
    droneRegMap,
    selectedFlightId,
    onSelectFlight,
    telemetryMap = {},
    hasAlert = false,
    droneRegistration = "—",
    uavId = "STANDBY",
}: FlightSelectorPopoverProps) {
    return (
        <Popover open={isOpen} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-subtle)] hover:bg-slate-100 px-3 py-2.5 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                            <Drone className="h-4 w-4 text-slate-700" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold font-mono text-slate-900 truncate">
                                    {uavId}
                                </span>
                                {hasAlert && <StatusBadge status="alert" label="LOW BAT" />}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono truncate">
                                {flight ? `Aircraft: ${droneRegistration}` : "No active flight"}
                            </div>
                        </div>
                    </div>
                    <ChevronDown
                        className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${
                            isOpen ? "rotate-180 text-slate-700" : ""
                        }`}
                    />
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
                                className="py-5"
                            />
                        ) : (
                            flights.map((item) => {
                                const isSelected = item.id === (flight?.id || selectedFlightId);
                                const hasLiveTelemetry = Boolean(telemetryMap[item.id]);
                                const reg = item.droneId
                                    ? droneRegMap?.get(item.droneId) || "Assigned UAV"
                                    : "Unassigned";

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => {
                                            onSelectFlight(item.id);
                                            onOpenChange(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-center justify-between p-2.5 rounded text-left transition-colors cursor-pointer",
                                            isSelected
                                                ? "text-slate-900 bg-slate-50"
                                                : "text-slate-700",
                                            "hover:bg-slate-100"
                                        )}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <Plane
                                                className={cn(
                                                    "h-4 w-4 shrink-0",
                                                    hasLiveTelemetry
                                                        ? "text-emerald-500"
                                                        : isSelected
                                                          ? "text-slate-800"
                                                          : "text-slate-400"
                                                )}
                                            />
                                            <div className="truncate">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={cn(
                                                            "text-xs",
                                                            isSelected
                                                                ? "font-bold text-slate-900"
                                                                : "font-semibold text-slate-800"
                                                        )}
                                                    >
                                                        {item.flightNumber || "Flight"}
                                                    </span>
                                                    {hasLiveTelemetry && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0" />
                                                    )}
                                                </div>
                                                <div className="text-[10px] truncate text-slate-500">
                                                    {reg} ·{" "}
                                                    {(
                                                        item.status ?? DEFAULT_FLIGHT_STATUS
                                                    ).toUpperCase()}
                                                </div>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <Check className="h-4 w-4 text-slate-800 shrink-0 ml-2 stroke-[2.5]" />
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

"use client";

import React, { useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { StatusBadge, Popover, PopoverContent, PopoverTrigger } from "@/components/ui";
import { cn } from "@/lib";
import { DEFAULT_FLIGHT_STATUS, FLIGHT_STATUS, type Flight, type TelemetryRecord } from "@/types";

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

function formatStatusLabel(status: string): string | undefined {
    return status === FLIGHT_STATUS.EMERGENCY_LANDING ? "EMERG LAND" : undefined;
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
    const listboxId = useId();
    const [query, setQuery] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const activeId = flight?.id || selectedFlightId;

    const enrichedFlights = useMemo(() => {
        return flights.map((item) => {
            const reg = item.droneId
                ? droneRegMap?.get(item.droneId) || "Assigned UAV"
                : "Unassigned";
            const status = item.status ?? DEFAULT_FLIGHT_STATUS;
            const code = item.flightNumber || "Flight";
            const hasLive = Boolean(telemetryMap[item.id]);
            return { item, reg, status, code, hasLive };
        });
    }, [flights, droneRegMap, telemetryMap]);

    const filteredFlights = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return enrichedFlights;
        return enrichedFlights.filter(
            ({ code, reg, status }) =>
                code.toLowerCase().includes(q) ||
                reg.toLowerCase().includes(q) ||
                status.replace(/_/g, " ").toLowerCase().includes(q)
        );
    }, [enrichedFlights, query]);

    const safeHighlightIndex =
        filteredFlights.length === 0
            ? -1
            : Math.min(Math.max(0, highlightedIndex), filteredFlights.length - 1);

    const handleOpenChange = (nextOpen: boolean) => {
        if (nextOpen) {
            setQuery("");
            const idx = enrichedFlights.findIndex((f) => f.item.id === activeId);
            setHighlightedIndex(idx >= 0 ? idx : 0);
        }
        onOpenChange(nextOpen);
    };

    const handleSelect = (id: string) => {
        onSelectFlight(id);
        onOpenChange(false);
        setQuery("");
    };

    const scrollItemIntoView = (idx: number) => {
        const container = listRef.current;
        if (!container) return;
        const el = container.querySelector<HTMLElement>(`[data-flight-opt="${idx}"]`);
        el?.scrollIntoView({ block: "nearest" });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (filteredFlights.length === 0) return;
            const next = (safeHighlightIndex + 1) % filteredFlights.length;
            setHighlightedIndex(next);
            scrollItemIntoView(next);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (filteredFlights.length === 0) return;
            const prev = (safeHighlightIndex - 1 + filteredFlights.length) % filteredFlights.length;
            setHighlightedIndex(prev);
            scrollItemIntoView(prev);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (safeHighlightIndex >= 0 && filteredFlights[safeHighlightIndex]) {
                handleSelect(filteredFlights[safeHighlightIndex].item.id);
            }
        } else if (e.key === "Escape") {
            e.preventDefault();
            onOpenChange(false);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-controls={listboxId}
                    aria-label="Select active flight"
                    className="w-full min-w-0 max-w-full overflow-hidden rounded-[6px] border border-slate-300 bg-white hover:border-slate-400 px-3 py-2 flex items-center justify-between gap-2 text-left shadow-2xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:border-slate-700 focus-visible:ring-2 focus-visible:ring-slate-300"
                >
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold font-mono text-slate-900 truncate">
                                {uavId}
                            </span>
                            {hasAlert && <StatusBadge status="alert" label="LOW BAT" />}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate">
                            {flight ? droneRegistration : "No active flight"}
                        </div>
                    </div>
                    <ChevronDown
                        className={cn(
                            "h-3.5 w-3.5 text-slate-500 shrink-0 transition-transform duration-150",
                            isOpen && "rotate-180"
                        )}
                        aria-hidden="true"
                    />
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                sideOffset={4}
                collisionPadding={12}
                onOpenAutoFocus={(e) => {
                    if (flights.length > 3) {
                        e.preventDefault();
                        requestAnimationFrame(() => inputRef.current?.focus());
                    }
                }}
                onKeyDown={handleKeyDown}
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                className="z-[9999] min-w-[var(--radix-popover-trigger-width)] w-max max-w-[max(var(--radix-popover-trigger-width),min(380px,calc(100vw-1.5rem)))] p-0 overflow-hidden rounded-[6px] border border-slate-200 bg-white text-slate-800 shadow-xl flex flex-col focus:outline-none"
            >
                {flights.length > 3 && (
                    <div className="px-2.5 py-2 border-b border-slate-100 flex items-center gap-2 shrink-0 bg-slate-50/60">
                        <Search
                            className="w-3.5 h-3.5 text-slate-400 shrink-0"
                            aria-hidden="true"
                        />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setHighlightedIndex(0);
                            }}
                            placeholder="Filter flight or aircraft…"
                            aria-label="Filter active flights"
                            className="w-full bg-transparent text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => {
                                    setQuery("");
                                    setHighlightedIndex(0);
                                    inputRef.current?.focus();
                                }}
                                aria-label="Clear filter"
                                className="text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                )}

                <div
                    id={listboxId}
                    ref={listRef}
                    role="listbox"
                    className="max-h-64 overflow-y-auto overscroll-contain p-1 divide-y divide-slate-100"
                >
                    {filteredFlights.length === 0 ? (
                        <div className="px-3 py-5 text-center text-xs font-mono text-slate-400">
                            {flights.length === 0 ? "No active flights" : "No matching flights"}
                        </div>
                    ) : (
                        filteredFlights.map(({ item, reg, status, code, hasLive }, idx) => {
                            const isSelected = item.id === activeId;
                            const isHighlighted = idx === safeHighlightIndex;

                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    data-flight-opt={idx}
                                    onMouseEnter={() => setHighlightedIndex(idx)}
                                    onClick={() => handleSelect(item.id)}
                                    className={cn(
                                        "relative w-full flex items-center justify-between gap-3 py-2 pl-7 pr-2.5 rounded-[4px] text-left transition-colors cursor-pointer outline-none",
                                        isHighlighted
                                            ? "bg-slate-100 text-slate-900"
                                            : "text-slate-700 hover:bg-slate-100"
                                    )}
                                >
                                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                        {isSelected && (
                                            <Check className="h-3.5 w-3.5 text-slate-800 stroke-[2.5]" />
                                        )}
                                    </span>

                                    <div className="min-w-0 flex-1">
                                        <div
                                            className={cn(
                                                "text-xs font-mono truncate",
                                                isSelected
                                                    ? "font-bold text-slate-900"
                                                    : "font-semibold text-slate-800"
                                            )}
                                        >
                                            {code}
                                        </div>
                                        <div className="text-[11px] font-mono text-slate-500 truncate">
                                            {hasLive ? `${reg} · Live` : reg}
                                        </div>
                                    </div>

                                    <StatusBadge
                                        status={status}
                                        label={formatStatusLabel(status)}
                                        className="shrink-0"
                                    />
                                </button>
                            );
                        })
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

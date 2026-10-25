"use client";

import { useState } from "react";
import { Radio, ChevronRight, Drone, Bot, Signal, Plane, Check, RefreshCw } from "lucide-react";
import { ChamferCard, StatusBadge, Popover, PopoverContent, PopoverTrigger } from "@/components/ui";
import type { Flight, TelemetryRecord } from "@/types";

export interface LiveTelemetryProps {
    telemetry?: TelemetryRecord | null;
    flight?: Flight | null;
    flights?: Flight[];
    selectedFlightId?: string | null;
    onSelectFlight?: (flightId: string) => void;
    telemetryMap?: Record<string, TelemetryRecord>;
    onReloadFlights?: () => void;
}

export function LiveTelemetry({
    telemetry,
    flight,
    flights = [],
    selectedFlightId,
    onSelectFlight,
    telemetryMap = {},
    onReloadFlights,
}: LiveTelemetryProps) {
    const [isFlightListOpen, setIsFlightListOpen] = useState(false);
    const hasTelemetry = !!telemetry;
    const altitudeMeters = telemetry?.altitude !== undefined ? Math.round(telemetry.altitude) : 0;
    const speedKmh = telemetry?.speed !== undefined ? Math.round(telemetry.speed * 3.6) : 0;
    const batteryPercent =
        telemetry?.batteryPercentage !== undefined ? Math.round(telemetry.batteryPercentage) : 0;
    const headingDegrees = telemetry?.heading !== undefined ? Math.round(telemetry.heading) : 0;
    const hasAlert = telemetry?.batteryPercentage !== undefined && telemetry.batteryPercentage < 20;

    const altitudeOffset = hasTelemetry
        ? Math.max(0, 238.76 - (Math.min(altitudeMeters, 200) / 200) * 238.76)
        : 238.76;
    const speedOffset = hasTelemetry
        ? Math.max(0, 238.76 - (Math.min(speedKmh, 120) / 120) * 238.76)
        : 238.76;
    const batteryOffset = hasTelemetry
        ? Math.max(0, 238.76 - (Math.min(batteryPercent, 100) / 100) * 238.76)
        : 238.76;

    const uavId =
        flight?.flightNumber ||
        (telemetry?.droneId
            ? `UAV-${telemetry.droneId.slice(0, 8)}`
            : flight?.droneId
              ? `UAV-${flight.droneId.slice(0, 8)}`
              : "STANDBY");
    const serialNumber = telemetry?.droneId?.slice(0, 8) || flight?.droneId?.slice(0, 8) || "—";
    const flightMode = flight?.status ? flight.status.toUpperCase() : "IDLE";
    const connectionState = hasTelemetry ? "LIVE" : "OFFLINE";

    return (
        <div className="bg-white border border-slate-300 rounded-lg p-4 flex flex-col justify-between h-[490px] relative shadow-xs">
            <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center space-x-2">
                        <Radio
                            className={`h-4 w-4 ${hasTelemetry ? "text-emerald-500 animate-pulse" : "text-slate-400"}`}
                        />
                        <span className="text-xs font-bold font-mono tracking-wider text-slate-900 uppercase">
                            LIVE TELEMETRY
                        </span>
                    </div>
                    <StatusBadge
                        status={hasTelemetry ? "live" : "offline"}
                        label={connectionState}
                    />
                </div>

                <Popover open={isFlightListOpen} onOpenChange={setIsFlightListOpen}>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            className="w-full mt-3 text-left cursor-pointer focus:outline-none"
                        >
                            <ChamferCard
                                size="md"
                                accent="dark"
                                className={`transition-all ${isFlightListOpen ? "ring-2 ring-cyan-500/50" : "hover:opacity-95"}`}
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
                                                {hasAlert && (
                                                    <StatusBadge status="alert" label="ALERT" />
                                                )}
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                                {flight
                                                    ? `Flight ${flight.flightNumber || flight.id.slice(0, 8)}`
                                                    : "No Flight Selected"}{" "}
                                                • SN: {serialNumber}
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight
                                        className={`h-4 w-4 text-slate-400 transition-transform ${isFlightListOpen ? "rotate-90 text-slate-700" : ""}`}
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
                                <div className="p-4 text-center text-slate-400 text-xs">
                                    No flights available
                                </div>
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
                                                setIsFlightListOpen(false);
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
                                                            {item.flightNumber ||
                                                                item.id.slice(0, 8)}
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

                <div className="grid grid-cols-2 gap-3 mt-4">
                    <ChamferCard size="md" accent="cyan">
                        <div className="p-3 bg-slate-50 flex flex-col items-center justify-center h-full">
                            <span className="text-[10px] font-bold text-slate-500 font-mono tracking-wider uppercase mb-1">
                                ALTITUDE
                            </span>
                            <div className="relative w-20 h-20 flex items-center justify-center">
                                <svg
                                    className="w-full h-full transform -rotate-90"
                                    viewBox="0 0 100 100"
                                >
                                    <circle
                                        cx="50"
                                        cy="50"
                                        fill="none"
                                        r="38"
                                        stroke="#e2e8f0"
                                        strokeWidth="7"
                                    />
                                    <circle
                                        cx="50"
                                        cy="50"
                                        fill="none"
                                        r="38"
                                        stroke="#64748B"
                                        strokeDasharray="238.76"
                                        strokeDashoffset={altitudeOffset}
                                        strokeLinecap="round"
                                        strokeWidth="7"
                                        className="transition-all duration-500"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-base font-bold font-mono text-slate-900 leading-none">
                                        {hasTelemetry ? altitudeMeters : "—"}
                                    </span>
                                    <span className="text-[9px] font-semibold text-slate-500 font-mono mt-0.5">
                                        m
                                    </span>
                                </div>
                            </div>
                        </div>
                    </ChamferCard>

                    <ChamferCard size="md" accent="cyan">
                        <div className="p-3 bg-slate-50 flex flex-col items-center justify-center h-full">
                            <span className="text-[10px] font-bold text-slate-500 font-mono tracking-wider uppercase mb-1">
                                SPEED
                            </span>
                            <div className="relative w-20 h-20 flex items-center justify-center">
                                <svg
                                    className="w-full h-full transform -rotate-90"
                                    viewBox="0 0 100 100"
                                >
                                    <circle
                                        cx="50"
                                        cy="50"
                                        fill="none"
                                        r="38"
                                        stroke="#e2e8f0"
                                        strokeWidth="7"
                                    />
                                    <circle
                                        cx="50"
                                        cy="50"
                                        fill="none"
                                        r="38"
                                        stroke="#475569"
                                        strokeDasharray="238.76"
                                        strokeDashoffset={speedOffset}
                                        strokeLinecap="round"
                                        strokeWidth="7"
                                        className="transition-all duration-500"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-base font-bold font-mono text-slate-900 leading-none">
                                        {hasTelemetry ? speedKmh : "—"}
                                    </span>
                                    <span className="text-[9px] font-semibold text-slate-500 font-mono mt-0.5">
                                        km/h
                                    </span>
                                </div>
                            </div>
                        </div>
                    </ChamferCard>

                    <ChamferCard size="md" accent="amber">
                        <div className="p-3 bg-slate-50 flex flex-col items-center justify-center h-full">
                            <span className="text-[10px] font-bold text-slate-500 font-mono tracking-wider uppercase mb-1">
                                BATTERY
                            </span>
                            <div className="relative w-20 h-20 flex items-center justify-center">
                                <svg
                                    className="w-full h-full transform -rotate-90"
                                    viewBox="0 0 100 100"
                                >
                                    <circle
                                        cx="50"
                                        cy="50"
                                        fill="none"
                                        r="38"
                                        stroke="#e2e8f0"
                                        strokeWidth="7"
                                    />
                                    <circle
                                        cx="50"
                                        cy="50"
                                        fill="none"
                                        r="38"
                                        stroke={batteryPercent < 20 ? "#ef4444" : "#f59e0b"}
                                        strokeDasharray="238.76"
                                        strokeDashoffset={batteryOffset}
                                        strokeLinecap="round"
                                        strokeWidth="7"
                                        className="transition-all duration-500"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span
                                        className={`text-base font-bold font-mono leading-none ${batteryPercent < 20 ? "text-red-600" : "text-amber-700"}`}
                                    >
                                        {hasTelemetry ? `${batteryPercent}%` : "—"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </ChamferCard>

                    <ChamferCard size="md" accent="cyan">
                        <div className="p-3 bg-slate-50 flex flex-col items-center justify-center h-full">
                            <span className="text-[10px] font-bold text-slate-500 font-mono tracking-wider uppercase mb-1">
                                HEADING
                            </span>
                            <div className="relative w-20 h-20 flex items-center justify-center">
                                <div className="w-16 h-16 rounded-full border border-dashed border-slate-300 relative flex items-center justify-center">
                                    <span className="absolute top-0.5 text-[8px] font-bold font-mono text-slate-700">
                                        N
                                    </span>
                                    <div
                                        className="absolute inset-0 flex items-center justify-center transition-transform duration-300"
                                        style={{ transform: `rotate(${headingDegrees}deg)` }}
                                    >
                                        <div className="w-1 h-1 rounded-full bg-slate-600 z-10" />
                                        <div className="absolute top-2.5 w-0.5 h-5 bg-slate-600" />
                                        <div className="absolute top-1.5 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[5px] border-b-slate-600" />
                                    </div>
                                    <div className="absolute bottom-0 text-[10px] font-mono font-bold text-slate-700">
                                        {hasTelemetry ? `${headingDegrees}°` : "—"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ChamferCard>
                </div>
            </div>

            <div className="pt-3 mt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                        MODE
                    </span>
                    <div className="flex items-center text-slate-800 font-bold mt-0.5">
                        <Bot className="h-4 w-4 mr-1 text-slate-600" />
                        {flightMode}
                    </div>
                </div>
                <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                        CONNECTION
                    </span>
                    <div
                        className={`flex items-center font-bold mt-0.5 ${hasTelemetry ? "text-emerald-600" : "text-slate-400"}`}
                    >
                        <Signal
                            className={`h-4 w-4 mr-1 ${hasTelemetry ? "text-emerald-600" : "text-slate-400"}`}
                        />
                        {connectionState}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LiveTelemetry;

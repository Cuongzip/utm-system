"use client";

import { useState } from "react";
import { Radio, Bot, Signal } from "lucide-react";
import { ChamferCard, StatusBadge } from "@/components/ui";
import { TelemetryGauge } from "./TelemetryGauge";
import { FlightSelectorPopover } from "./FlightSelectorPopover";
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

                <FlightSelectorPopover
                    isOpen={isFlightListOpen}
                    onOpenChange={setIsFlightListOpen}
                    flight={flight}
                    flights={flights}
                    selectedFlightId={selectedFlightId}
                    onSelectFlight={onSelectFlight}
                    telemetryMap={telemetryMap}
                    onReloadFlights={onReloadFlights}
                    hasAlert={hasAlert}
                    serialNumber={serialNumber}
                    uavId={uavId}
                />

                <div className="grid grid-cols-2 gap-3 mt-4">
                    <TelemetryGauge
                        label="ALTITUDE"
                        value={altitudeMeters}
                        unit="m"
                        offset={altitudeOffset}
                        strokeColor="#64748B"
                        accent="cyan"
                        hasData={hasTelemetry}
                    />

                    <TelemetryGauge
                        label="SPEED"
                        value={speedKmh}
                        unit="km/h"
                        offset={speedOffset}
                        strokeColor="#475569"
                        accent="cyan"
                        hasData={hasTelemetry}
                    />

                    <TelemetryGauge
                        label="BATTERY"
                        value={`${batteryPercent}%`}
                        offset={batteryOffset}
                        strokeColor={batteryPercent < 20 ? "#ef4444" : "#f59e0b"}
                        accent={batteryPercent < 20 ? "red" : "amber"}
                        hasData={hasTelemetry}
                        valueClassName={batteryPercent < 20 ? "text-red-600" : "text-amber-700"}
                    />

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

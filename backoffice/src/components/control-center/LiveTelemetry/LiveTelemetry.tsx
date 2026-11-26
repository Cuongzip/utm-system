"use client";

import { useState, useMemo } from "react";
import { Radio, Compass } from "lucide-react";
import { ChamferCard, StatusBadge, Tooltip } from "@/components/ui";
import { useFlightConformance } from "@/hooks";
import { formatCoordinates } from "@/utils";
import { FlightSelectorPopover } from "./FlightSelectorPopover";
import {
    CONFORMANCE_STATUS,
    DEFAULT_FLIGHT_STATUS,
    FLIGHT_STATUS,
    type Drone,
    type Flight,
    type TelemetryRecord,
} from "@/types";

export interface LiveTelemetryProps {
    telemetry: TelemetryRecord | null;
    flight: Flight | null;
    flights: Flight[];
    drones?: Drone[];
    selectedFlightId: string | null;
    onSelectFlight: (flightId: string) => void;
    telemetryMap: Record<string, TelemetryRecord>;
}

function getCardinalDirection(deg: number): string {
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const normalized = ((deg % 360) + 360) % 360;
    return dirs[Math.round(normalized / 45) % 8];
}

export function LiveTelemetry({
    telemetry,
    flight,
    flights = [],
    drones = [],
    selectedFlightId,
    onSelectFlight,
    telemetryMap = {},
}: LiveTelemetryProps) {
    const [isFlightListOpen, setIsFlightListOpen] = useState(false);
    const { data: conformance } = useFlightConformance(flight?.id, Boolean(flight?.id));

    const droneRegMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const d of drones) {
            if (d.id) {
                map.set(d.id, d.registrationNumber || d.model || "UAV");
            }
        }
        return map;
    }, [drones]);

    const hasTelemetry = Boolean(telemetry);
    const altitudeMeters = telemetry?.altitude != null ? Math.round(telemetry.altitude) : null;
    const speedKmh = telemetry?.speed != null ? Math.round(telemetry.speed * 3.6) : null;
    const batteryPercent =
        telemetry?.batteryPercentage != null ? Math.round(telemetry.batteryPercentage) : null;
    const headingDegrees = telemetry?.heading != null ? Math.round(telemetry.heading) : null;
    const hasAlert = batteryPercent != null && batteryPercent < 20;

    const activeDroneId = telemetry?.droneId || flight?.droneId;
    const droneRegistration = activeDroneId
        ? droneRegMap.get(activeDroneId) || "Assigned UAV"
        : "—";
    const uavId = flight?.flightNumber || (activeDroneId ? droneRegistration : "STANDBY");

    const rawStatus = flight?.status ?? DEFAULT_FLIGHT_STATUS;
    const flightModeLabel =
        rawStatus === FLIGHT_STATUS.EMERGENCY_LANDING
            ? "EMERG LAND"
            : rawStatus.replace(/_/g, " ").toUpperCase();
    const connectionState = hasTelemetry ? "LIVE" : "OFFLINE";
    const conformanceState =
        conformance?.status ?? flight?.conformanceStatus ?? CONFORMANCE_STATUS.UNKNOWN;
    const conformanceLabel =
        conformanceState === CONFORMANCE_STATUS.NON_CONFORMING
            ? "BREACH"
            : conformanceState.replace(/_/g, " ").toUpperCase();
    const corridorTooltip =
        conformance?.crossTrackErrorM != null || conformance?.verticalErrorM != null
            ? `Lateral: ${Math.round(conformance.crossTrackErrorM ?? 0)}m · Alt Δ: ${Math.round(conformance.verticalErrorM ?? 0)}m`
            : undefined;

    const positionStr =
        telemetry?.latitude != null && telemetry?.longitude != null
            ? formatCoordinates({ latitude: telemetry.latitude, longitude: telemetry.longitude })
            : "Awaiting fix";

    const batteryColorClass =
        batteryPercent == null
            ? "text-slate-400"
            : batteryPercent < 20
              ? "text-red-600"
              : batteryPercent <= 40
                ? "text-amber-600"
                : "text-slate-900";

    const batteryBarClass =
        batteryPercent == null
            ? "bg-slate-200"
            : batteryPercent < 20
              ? "bg-red-600"
              : batteryPercent <= 40
                ? "bg-amber-500"
                : "bg-slate-800";

    return (
        <ChamferCard size="lg" className="h-[520px]">
            <div className="p-4 flex flex-col justify-between h-full">
                <div className="flex flex-col gap-3.5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                            <Radio className="h-4 w-4 text-slate-500" />
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
                        droneRegMap={droneRegMap}
                        selectedFlightId={selectedFlightId}
                        onSelectFlight={onSelectFlight}
                        telemetryMap={telemetryMap}
                        hasAlert={hasAlert}
                        droneRegistration={droneRegistration}
                        uavId={uavId}
                    />

                    <div className="grid grid-cols-2 gap-px bg-[var(--color-border-default)] border border-[var(--color-border-default)] rounded-md overflow-hidden">
                        <div className="bg-[var(--color-surface-panel)] p-4 flex flex-col justify-between min-h-[126px]">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                                Altitude (AGL)
                            </span>
                            <div>
                                <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums leading-tight">
                                    {altitudeMeters != null ? `${altitudeMeters} m` : "—"}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400 mt-1">
                                    {flight?.maxAltitudeM != null
                                        ? `Ceiling ${Math.round(flight.maxAltitudeM)} m`
                                        : "Barometric / GNSS"}
                                </div>
                            </div>
                        </div>

                        <div className="bg-[var(--color-surface-panel)] p-4 flex flex-col justify-between min-h-[126px]">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                                Ground Speed
                            </span>
                            <div>
                                <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums leading-tight">
                                    {speedKmh != null ? `${speedKmh} km/h` : "—"}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400 mt-1">
                                    {telemetry?.speed != null
                                        ? `${telemetry.speed.toFixed(1)} m/s`
                                        : "Horizontal vector"}
                                </div>
                            </div>
                        </div>

                        <div className="bg-[var(--color-surface-panel)] p-4 flex flex-col justify-between min-h-[126px]">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                                Battery Pack
                            </span>
                            <div>
                                <div
                                    className={`font-mono text-2xl font-bold tabular-nums leading-tight ${batteryColorClass}`}
                                >
                                    {batteryPercent != null ? `${batteryPercent}%` : "—"}
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden mt-2">
                                    <div
                                        className={`h-full transition-all duration-300 ${batteryBarClass}`}
                                        style={{
                                            width: `${Math.min(100, Math.max(0, batteryPercent ?? 0))}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-[var(--color-surface-panel)] p-4 flex flex-col justify-between min-h-[126px]">
                            <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                                    Heading
                                </span>
                                <Compass
                                    className="w-3.5 h-3.5 text-slate-400 transition-transform duration-300"
                                    style={
                                        headingDegrees != null
                                            ? { transform: `rotate(${headingDegrees}deg)` }
                                            : undefined
                                    }
                                    aria-hidden="true"
                                />
                            </div>
                            <div>
                                <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums leading-tight">
                                    {headingDegrees != null ? `${headingDegrees}°` : "—"}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400 mt-1">
                                    {headingDegrees != null
                                        ? `Course ${getCardinalDirection(headingDegrees)}`
                                        : "Magnetic track"}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-3 border-t border-slate-200 grid grid-cols-3 gap-2 text-xs font-mono">
                    <div className="min-w-0">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                            MODE
                        </span>
                        <span
                            className="text-[11px] font-bold text-slate-900 block mt-0.5 truncate"
                            title={rawStatus.replace(/_/g, " ").toUpperCase()}
                        >
                            {flightModeLabel}
                        </span>
                    </div>
                    <div className="min-w-0">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                            CORRIDOR
                        </span>
                        <div className="mt-0.5 flex items-center h-[18px]">
                            <Tooltip content={corridorTooltip} side="top">
                                <span>
                                    <StatusBadge
                                        status={conformanceState}
                                        label={conformanceLabel}
                                    />
                                </span>
                            </Tooltip>
                        </div>
                    </div>
                    <div className="min-w-0">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                            POSITION
                        </span>
                        <span
                            className="text-[11px] text-slate-700 font-semibold block mt-0.5 truncate tabular-nums"
                            title={positionStr}
                        >
                            {positionStr}
                        </span>
                    </div>
                </div>
            </div>
        </ChamferCard>
    );
}

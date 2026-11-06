"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    Radio,
    Terminal,
    Cpu,
    Copy,
    Check,
    ExternalLink,
    ScrollText,
    Satellite,
} from "lucide-react";
import {
    ChamferCard,
    StatusBadge,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui";
import { useTelemetryStream } from "@/hooks/useStomp";
import { useQuery } from "@tanstack/react-query";
import { simulationService } from "@/services/simulationService";
import { QUERY_KEYS } from "@/hooks";
import { toast } from "sonner";
import { formatTime } from "@/utils";
import type { SimulationSession, TelemetryRecord } from "@/types";

export interface SessionLiveFeedProps {
    session: SimulationSession;
}

type TabType = "telemetry" | "events" | "specs";

export function SessionLiveFeed({ session }: SessionLiveFeedProps) {
    const [activeTab, setActiveTab] = useState<TabType>("telemetry");
    const [records, setRecords] = useState<TelemetryRecord[]>([]);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const normStatus = String(session.status || "").toLowerCase();
    const isRunning = normStatus === "running";
    const isC2Lost = String(session.activeScenario || "").toLowerCase() === "c2_lost";

    const handleIncomingRecord = useCallback(
        (rec: TelemetryRecord) => {
            if (!rec || isC2Lost) return;
            setRecords((prev) => [rec, ...prev.slice(0, 49)]);
        },
        [isC2Lost]
    );

    useTelemetryStream(handleIncomingRecord, session.flightId, isRunning && !isC2Lost);

    useEffect(() => {
        if (isC2Lost) return;

        if (session.currentLat != null && session.currentLon != null) {
            const snap: TelemetryRecord = {
                id: `snap-${Date.now()}`,
                flightId: session.flightId,
                droneId: session.droneId,
                latitude: session.currentLat,
                longitude: session.currentLon,
                altitude: session.currentAlt ?? 0,
                speed: session.speed ?? 0,
                heading: session.currentHeading ?? 0,
                batteryPercentage: session.currentBattery ?? 100,
            };

            setRecords((prev) => {
                if (prev.length === 0) return [snap];
                const latest = prev[0];
                if (
                    Math.abs((latest.latitude ?? 0) - (session.currentLat ?? 0)) < 1e-6 &&
                    Math.abs((latest.longitude ?? 0) - (session.currentLon ?? 0)) < 1e-6 &&
                    Math.abs((latest.batteryPercentage ?? 0) - (session.currentBattery ?? 0)) < 1e-2
                ) {
                    return prev;
                }
                return [snap, ...prev.slice(0, 49)];
            });
        }
    }, [
        isC2Lost,
        session.currentLat,
        session.currentLon,
        session.currentAlt,
        session.speed,
        session.currentHeading,
        session.currentBattery,
        session.flightId,
        session.droneId,
    ]);

    const { data: events = [] } = useQuery({
        queryKey: QUERY_KEYS.simulationEvents(session.id),
        queryFn: () => simulationService.getEvents(session.id),
        enabled: Boolean(session.id),
        refetchInterval: isRunning ? 2000 : false,
    });

    const handleCopy = (text: string, fieldName: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        toast.success(`Copied ${fieldName} to clipboard`);
        setTimeout(() => setCopiedField(null), 1800);
    };

    const isCompleted =
        normStatus === "completed" || (session.progress != null && session.progress >= 100);

    const latLonText =
        session.currentLat != null && session.currentLon != null
            ? `${session.currentLat.toFixed(6)}, ${session.currentLon.toFixed(6)}`
            : "Awaiting GNSS fix";

    return (
        <div className="flex flex-col gap-3 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button
                        type="button"
                        onClick={() => setActiveTab("telemetry")}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-bold rounded-md transition-all cursor-pointer ${
                            activeTab === "telemetry"
                                ? "bg-white text-slate-900 shadow-xs"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                        }`}
                    >
                        <Radio className="w-3.5 h-3.5 text-cyan-600" />
                        <span>Telemetry</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("events")}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-bold rounded-md transition-all cursor-pointer ${
                            activeTab === "events"
                                ? "bg-white text-slate-900 shadow-xs"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                        }`}
                    >
                        <Terminal className="w-3.5 h-3.5 text-slate-700" />
                        <span>Activity Log</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("specs")}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-bold rounded-md transition-all cursor-pointer ${
                            activeTab === "specs"
                                ? "bg-white text-slate-900 shadow-xs"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                        }`}
                    >
                        <Cpu className="w-3.5 h-3.5 text-slate-700" />
                        <span>Specs</span>
                    </button>
                </div>
            </div>

            <ChamferCard size="lg" className="w-full">
                {activeTab === "telemetry" && (
                    <div className="p-0">
                        {records.length === 0 ? (
                            <div className="p-8 flex flex-col items-center justify-center text-center">
                                <Satellite className="w-8 h-8 text-slate-300 mb-2 animate-pulse" />
                                <p className="text-xs font-mono text-slate-500">
                                    Awaiting telemetry broadcast packets...
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    Packets streamed via WebSocket topic /topic/telemetry/flight/
                                    {session.flightId} will appear in real time.
                                </p>
                            </div>
                        ) : (
                            <Table fixed={false} wrapperClassName="max-h-[420px] overflow-y-auto">
                                <TableHeader className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                                    <TableRow>
                                        <TableHead className="font-mono text-[11px] uppercase">
                                            TIME
                                        </TableHead>
                                        <TableHead className="font-mono text-[11px] uppercase">
                                            COORDINATES (LAT, LON)
                                        </TableHead>
                                        <TableHead className="font-mono text-[11px] uppercase">
                                            ALTITUDE
                                        </TableHead>
                                        <TableHead className="font-mono text-[11px] uppercase">
                                            SPEED
                                        </TableHead>
                                        <TableHead className="font-mono text-[11px] uppercase">
                                            HEADING
                                        </TableHead>
                                        <TableHead className="font-mono text-[11px] uppercase">
                                            BATTERY
                                        </TableHead>
                                        <TableHead className="font-mono text-[11px] uppercase">
                                            TARGET DRONE
                                        </TableHead>
                                        <TableHead className="font-mono text-[11px] uppercase text-right">
                                            FEED
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-slate-100 font-mono text-xs">
                                    {records.map((rec, index) => {
                                        const lat =
                                            rec.latitude != null ? rec.latitude.toFixed(6) : "—";
                                        const lon =
                                            rec.longitude != null ? rec.longitude.toFixed(6) : "—";
                                        const alt =
                                            rec.altitude != null
                                                ? `${rec.altitude.toFixed(1)} m`
                                                : "—";
                                        const spd =
                                            rec.speed != null ? `${rec.speed.toFixed(1)} m/s` : "—";
                                        const hdg =
                                            rec.heading != null
                                                ? `${rec.heading.toFixed(0)}°`
                                                : "—";
                                        const bat =
                                            rec.batteryPercentage != null
                                                ? `${rec.batteryPercentage.toFixed(1)}%`
                                                : "—";
                                        const isFirst = index === 0;

                                        return (
                                            <TableRow
                                                key={rec.id || index}
                                                className={`transition-colors hover:bg-slate-50 ${isFirst ? "bg-cyan-50/30" : ""}`}
                                            >
                                                <TableCell className="font-semibold text-slate-500 whitespace-nowrap">
                                                    {formatTime(new Date().toISOString())}
                                                </TableCell>
                                                <TableCell className="font-medium text-slate-800 whitespace-nowrap">
                                                    {lat}, {lon}
                                                </TableCell>
                                                <TableCell className="text-slate-700 whitespace-nowrap">
                                                    {alt}
                                                </TableCell>
                                                <TableCell className="text-slate-700 whitespace-nowrap">
                                                    {spd}
                                                </TableCell>
                                                <TableCell className="text-slate-700 whitespace-nowrap">
                                                    {hdg}
                                                </TableCell>
                                                <TableCell className="font-bold text-slate-800 whitespace-nowrap">
                                                    <span
                                                        className={
                                                            (rec.batteryPercentage ?? 100) < 20
                                                                ? "text-red-600"
                                                                : (rec.batteryPercentage ?? 100) <
                                                                    50
                                                                  ? "text-amber-600"
                                                                  : "text-emerald-600"
                                                        }
                                                    >
                                                        {bat}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-slate-500 whitespace-nowrap">
                                                    {rec.droneId
                                                        ? `${rec.droneId.slice(0, 8)}...`
                                                        : session.droneId
                                                          ? `${session.droneId.slice(0, 8)}...`
                                                          : "—"}
                                                </TableCell>
                                                <TableCell className="text-right whitespace-nowrap">
                                                    {isFirst ? (
                                                        <StatusBadge
                                                            status="live"
                                                            label="LIVE"
                                                            dotShape="circle"
                                                        />
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400">
                                                            HISTORIC
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                )}

                {activeTab === "events" && (
                    <div className="p-4">
                        {events.length === 0 ? (
                            <div className="py-8 flex flex-col items-center justify-center text-center">
                                <ScrollText className="w-8 h-8 text-slate-300 mb-2" />
                                <p className="text-xs font-mono text-slate-500">
                                    No incident events recorded yet.
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    Injection actions, warnings, and lifecycle transitions will
                                    appear here in real time.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                                {[...events].reverse().map((evt, idx) => {
                                    const timeStr = formatTime(evt.createdOn);
                                    return (
                                        <div
                                            key={evt.id || idx}
                                            className="py-2.5 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/80 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-mono font-semibold text-slate-400 shrink-0">
                                                    {timeStr}
                                                </span>
                                                <StatusBadge
                                                    status={evt.severity || "info"}
                                                    dotShape="circle"
                                                />
                                                {evt.scenario && (
                                                    <span className="text-[11px] font-mono text-slate-500 uppercase">
                                                        [{evt.scenario}]
                                                    </span>
                                                )}
                                                <span className="text-xs font-mono text-slate-800">
                                                    {evt.message || evt.type || "Event"}
                                                </span>
                                            </div>

                                            {evt.type && (
                                                <span className="text-[10px] font-mono text-slate-400 uppercase shrink-0">
                                                    {evt.type}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "specs" && (
                    <div className="p-4 flex flex-col divide-y divide-slate-100 font-mono text-xs">
                        <div className="py-2.5 first:pt-0 flex items-center justify-between gap-3">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                FLIGHT PLAN
                            </span>
                            <div className="flex items-center gap-2">
                                {session.flightId ? (
                                    <>
                                        <Link
                                            href={`/dashboard/flights/${session.flightId}`}
                                            className="font-bold text-slate-800 hover:text-indigo-600 transition-colors flex items-center gap-1"
                                            title={session.flightId}
                                        >
                                            <span>
                                                {session.flightId.slice(0, 8)}...
                                                {session.flightId.slice(-6)}
                                            </span>
                                            <ExternalLink className="w-3 h-3 text-slate-400" />
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleCopy(session.flightId || "", "Flight Plan ID")
                                            }
                                            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                            title="Copy full UUID"
                                        >
                                            {copiedField === "Flight Plan ID" ? (
                                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                            ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </>
                                ) : (
                                    <span className="text-slate-400">—</span>
                                )}
                            </div>
                        </div>

                        <div className="py-2.5 flex items-center justify-between gap-3">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                TARGET HARDWARE DRONE
                            </span>
                            <div className="flex items-center gap-2">
                                {session.droneId ? (
                                    <>
                                        <Link
                                            href="/dashboard/drones"
                                            className="font-bold text-slate-800 hover:text-indigo-600 transition-colors flex items-center gap-1"
                                            title={session.droneId}
                                        >
                                            <span>
                                                {session.droneId.length > 18
                                                    ? `${session.droneId.slice(0, 8)}...${session.droneId.slice(-6)}`
                                                    : session.droneId}
                                            </span>
                                            <ExternalLink className="w-3 h-3 text-slate-400" />
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleCopy(session.droneId || "", "Drone ID")
                                            }
                                            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                            title="Copy full UUID"
                                        >
                                            {copiedField === "Drone ID" ? (
                                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                            ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </>
                                ) : (
                                    <span className="text-slate-400">Auto-assigned</span>
                                )}
                            </div>
                        </div>

                        <div className="py-2.5 flex items-center justify-between gap-3">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                GNSS POSITION
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-700 font-medium">{latLonText}</span>
                                {session.currentLat != null && session.currentLon != null && (
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(latLonText, "Coordinates")}
                                        className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                        title="Copy Coordinates"
                                    >
                                        {copiedField === "Coordinates" ? (
                                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                                        ) : (
                                            <Copy className="w-3.5 h-3.5" />
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="py-2.5 flex items-center justify-between gap-3">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                CORRIDOR SEGMENT
                            </span>
                            <span className="font-bold text-slate-800">
                                {isCompleted
                                    ? "Reached Destination"
                                    : session.currentSegment != null
                                      ? `Active Segment #${session.currentSegment}`
                                      : "Nominal Trajectory"}
                            </span>
                        </div>

                        <div className="py-2.5 flex items-center justify-between gap-3">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                TIME SCALE
                            </span>
                            <span className="font-bold text-slate-800">
                                {session.timeScale != null ? `${session.timeScale}x` : "1.0x"}
                            </span>
                        </div>
                    </div>
                )}
            </ChamferCard>
        </div>
    );
}

export default SessionLiveFeed;

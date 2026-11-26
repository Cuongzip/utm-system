"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Copy, Check, ExternalLink, ScrollText, Satellite } from "lucide-react";
import {
    ChamferCard,
    StatusBadge,
    EmptyState,
    UnderlineTabs,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    type UnderlineTabItem,
} from "@/components/ui";
import { useTelemetryStream } from "@/hooks/useStomp";
import { useSimulationEvents, useFlightsAll, useDronesAll } from "@/hooks";
import { toast } from "sonner";
import { formatTime, formatCoordinates, formatAltitude } from "@/utils";
import {
    SIMULATION_STATUS,
    SIMULATION_SCENARIO,
    type SimulationSession,
    type TelemetryRecord,
} from "@/types";

export interface SessionLiveFeedProps {
    session: SimulationSession;
}

type TabType = "telemetry" | "events" | "specs";

export function SessionLiveFeed({ session }: SessionLiveFeedProps) {
    const [activeTab, setActiveTab] = useState<TabType>("telemetry");
    const [wsRecords, setWsRecords] = useState<TelemetryRecord[]>([]);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const { data: flights = [] } = useFlightsAll();
    const { data: drones = [] } = useDronesAll();

    const normStatus = String(session.status || "").toLowerCase();
    const isRunning = normStatus === SIMULATION_STATUS.RUNNING;
    const isC2Lost =
        String(session.activeScenario || "").toLowerCase() === SIMULATION_SCENARIO.C2_LOST;

    const handleIncomingRecord = useCallback(
        (rec: TelemetryRecord) => {
            if (!rec || isC2Lost) return;
            setWsRecords((prev) => [rec, ...prev.slice(0, 49)]);
        },
        [isC2Lost]
    );

    useTelemetryStream(handleIncomingRecord, session.flightId, isRunning && !isC2Lost);

    const records = useMemo<TelemetryRecord[]>(() => {
        if (isC2Lost || session.currentLat == null || session.currentLon == null) {
            return wsRecords;
        }
        const latest = wsRecords[0];
        if (
            latest &&
            Math.abs((latest.latitude ?? 0) - session.currentLat) < 1e-6 &&
            Math.abs((latest.longitude ?? 0) - session.currentLon) < 1e-6 &&
            Math.abs((latest.batteryPercentage ?? 0) - (session.currentBattery ?? 100)) < 1e-2
        ) {
            return wsRecords;
        }
        const snap: TelemetryRecord = {
            id: `snap-${session.lastModifiedOn || session.id}`,
            flightId: session.flightId,
            droneId: session.droneId,
            latitude: session.currentLat,
            longitude: session.currentLon,
            altitude: session.currentAlt ?? 0,
            speed: session.speed ?? 0,
            heading: session.currentHeading ?? 0,
            batteryPercentage: session.currentBattery ?? 100,
            timestamp: session.lastModifiedOn || session.createdOn,
        };
        return [snap, ...wsRecords.slice(0, 49)];
    }, [
        wsRecords,
        isC2Lost,
        session.id,
        session.currentLat,
        session.currentLon,
        session.currentAlt,
        session.speed,
        session.currentHeading,
        session.currentBattery,
        session.flightId,
        session.droneId,
        session.lastModifiedOn,
        session.createdOn,
    ]);

    const { data: events = [] } = useSimulationEvents(session.id, isRunning);

    const handleCopy = (text: string, fieldName: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        toast.success(`Copied ${fieldName} to clipboard`);
        setTimeout(() => setCopiedField(null), 1800);
    };

    const isCompleted =
        normStatus === SIMULATION_STATUS.COMPLETED ||
        (session.progress != null && session.progress >= 100);

    const latLonText = formatCoordinates(
        { latitude: session.currentLat, longitude: session.currentLon },
        6,
        "Awaiting GNSS fix"
    );

    const resolvedFlight = useMemo(
        () => (session.flightId ? flights.find((f) => f.id === session.flightId) : undefined),
        [flights, session.flightId]
    );
    const effectiveDroneId = session.droneId || resolvedFlight?.droneId;
    const resolvedDroneLabel = useMemo(() => {
        if (!effectiveDroneId) return null;
        const found = drones.find((d) => d.id === effectiveDroneId);
        return (
            found?.registrationNumber ||
            found?.model ||
            `DRN-${effectiveDroneId.slice(0, 8).toUpperCase()}`
        );
    }, [drones, effectiveDroneId]);

    const tabs: readonly UnderlineTabItem<TabType>[] = [
        { id: "telemetry", label: "Live Telemetry", count: records.length },
        { id: "events", label: "Activity Log", count: events.length },
        { id: "specs", label: "Session Specs" },
    ];

    return (
        <div className="flex flex-col gap-4 w-full">
            <UnderlineTabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                ariaLabel="Simulation session data"
            />

            <ChamferCard size="lg" className="w-full">
                {activeTab === "telemetry" && (
                    <div className="p-0">
                        {records.length === 0 ? (
                            <EmptyState
                                compact
                                icon={Satellite}
                                title="Awaiting Telemetry Packets"
                                description="Live position, altitude, heading, and battery samples appear here while the simulation is running."
                            />
                        ) : (
                            <Table fixed={false} wrapperClassName="max-h-[420px] overflow-y-auto">
                                <TableHeader className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                                    <TableRow>
                                        <TableHead>TIME</TableHead>
                                        <TableHead>COORDINATES (LAT, LON)</TableHead>
                                        <TableHead>ALTITUDE</TableHead>
                                        <TableHead>SPEED</TableHead>
                                        <TableHead>HEADING</TableHead>
                                        <TableHead>BATTERY</TableHead>
                                        <TableHead align="right">STREAM</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-slate-100 font-mono text-xs">
                                    {records.map((rec, index) => {
                                        const coords = formatCoordinates(rec, 6);
                                        const alt = formatAltitude(rec.altitude);
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
                                                className={`transition-colors hover:bg-slate-50 ${isFirst ? "bg-slate-50/80" : ""}`}
                                            >
                                                <TableCell mono muted>
                                                    {formatTime(
                                                        rec.timestamp ?? new Date().toISOString()
                                                    )}
                                                </TableCell>
                                                <TableCell mono darkText>
                                                    {coords}
                                                </TableCell>
                                                <TableCell mono darkText>
                                                    {alt}
                                                </TableCell>
                                                <TableCell mono darkText>
                                                    {spd}
                                                </TableCell>
                                                <TableCell mono darkText>
                                                    {hdg}
                                                </TableCell>
                                                <TableCell mono bold>
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
                                                <TableCell align="right">
                                                    {isFirst ? (
                                                        <StatusBadge
                                                            status="live"
                                                            label="LIVE"
                                                            dotShape="circle"
                                                        />
                                                    ) : (
                                                        <span className="text-[10px] font-mono text-slate-400">
                                                            SAMPLE
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
                            <EmptyState
                                compact
                                icon={ScrollText}
                                title="No Activity Events Recorded"
                                description="Fault injections, warnings, and session lifecycle transitions appear here in real time."
                            />
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
                                                <span className="text-xs font-mono font-semibold text-slate-400 shrink-0 tabular-nums">
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
                                            className="font-bold text-slate-800 hover:text-slate-600 hover:underline transition-colors flex items-center gap-1"
                                            title={session.flightId}
                                        >
                                            <span>
                                                {resolvedFlight?.flightNumber ||
                                                    `FLT-${session.flightId.slice(0, 8).toUpperCase()}`}
                                            </span>
                                            <ExternalLink className="w-3 h-3 text-slate-400" />
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleCopy(session.flightId || "", "Flight Plan ID")
                                            }
                                            className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                            title="Copy Flight Plan UUID"
                                            aria-label="Copy Flight Plan ID"
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
                                TARGET AIRCRAFT
                            </span>
                            <div className="flex items-center gap-2">
                                {effectiveDroneId ? (
                                    <>
                                        <Link
                                            href="/dashboard/drones"
                                            className="font-bold text-slate-800 hover:text-slate-600 hover:underline transition-colors flex items-center gap-1"
                                            title={effectiveDroneId}
                                        >
                                            <span>{resolvedDroneLabel}</span>
                                            <ExternalLink className="w-3 h-3 text-slate-400" />
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(effectiveDroneId, "Drone ID")}
                                            className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                            title="Copy Drone UUID"
                                            aria-label="Copy Drone ID"
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
                                        className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                        title="Copy Coordinates"
                                        aria-label="Copy Coordinates"
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

                        <div className="py-2.5 last:pb-0 flex items-center justify-between gap-3">
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

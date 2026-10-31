"use client";

import React, { useState, useEffect } from "react";
import { Eye, Play, RotateCcw, Mic, Crosshair } from "lucide-react";
import {
    TacticalMapContainer,
    FlightsLayer,
    HubsLayer,
    AirspaceLayer,
    LiveTelemetryLayer,
    useCesium,
    fitCameraToBounds,
} from "@/components/map";
import type { Flight, Hub, AirspaceZone, TelemetryRecord } from "@/types";
import { toast } from "sonner";

export interface DashboardTacticalMapProps {
    flights: Flight[];
    activeFlights?: Flight[];
    hubs: Hub[];
    dronesCount: number;
    airspaceZones: AirspaceZone[];
    telemetryMap?: Record<string, TelemetryRecord>;
    telemetryHistoryMap?: Record<string, TelemetryRecord[]>;
    activeTelemetryCount?: number;
    isSocketConnected?: boolean;
}

function PerspectiveResetHandler({ hubs, trigger }: { hubs: Hub[]; trigger: number }) {
    const { viewer, isLoaded } = useCesium();
    const hasInitialFitRef = React.useRef(false);

    useEffect(() => {
        if (!viewer || !isLoaded) return;
        if (trigger === 0 && hasInitialFitRef.current) return;

        const points = hubs.flatMap((h) =>
            h.location ? [{ lat: h.location.lat, lng: h.location.lng }] : []
        );
        if (points.length > 0 || trigger > 0) {
            hasInitialFitRef.current = true;
            fitCameraToBounds(viewer, points.length ? points : [{ lat: 16.0544, lng: 108.2208 }], {
                animate: trigger > 0,
                duration: 1.2,
                minHeight: points.length > 0 ? 1500 : 35000,
            });
        }
    }, [viewer, isLoaded, trigger, hubs]);

    return null;
}

export function DashboardTacticalMap({
    flights = [],
    activeFlights = [],
    hubs = [],
    dronesCount = 0,
    airspaceZones = [],
    telemetryMap = {},
    telemetryHistoryMap = {},
    activeTelemetryCount = 0,
    isSocketConnected = false,
}: DashboardTacticalMapProps) {
    const [filterTraffic, setFilterTraffic] = useState(true);
    const [filterAirspace, setFilterAirspace] = useState(true);
    const [filterHubs, setFilterHubs] = useState(true);
    const [showForesight, setShowForesight] = useState(false);
    const [resetTrigger, setResetTrigger] = useState(0);
    const [isDemoRunning, setIsDemoRunning] = useState(false);

    const handleRunDemo = () => {
        setIsDemoRunning((prev) => !prev);
        toast.info(isDemoRunning ? "Simulation demo paused" : "Simulation demo started");
    };

    const handleForesight = () => {
        setShowForesight((prev) => !prev);
        toast.info(
            !showForesight
                ? "Trajectory foresight projection enabled"
                : "Trajectory foresight hidden"
        );
    };

    const handleReset = () => {
        setResetTrigger((prev) => prev + 1);
        toast.info("Map perspective reset to tactical bounds");
    };

    const handleVoice = () => {
        toast.info("Voice synthesis command active");
    };

    return (
        <TacticalMapContainer
            initialMode="2d"
            initialLayerType="satellite"
            className="w-full"
            header={
                <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold font-mono tracking-wider text-slate-900 uppercase">
                            TACTICAL MAP
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setFilterTraffic((prev) => !prev)}
                            className={`px-2.5 py-1 text-xs font-mono font-semibold transition-all cursor-pointer rounded ${
                                filterTraffic
                                    ? "bg-slate-800 text-white shadow-xs"
                                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                            LIVE TRAFFIC
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterAirspace((prev) => !prev)}
                            className={`px-2.5 py-1 text-xs font-mono font-semibold transition-all cursor-pointer rounded ${
                                filterAirspace
                                    ? "bg-slate-800 text-white shadow-xs"
                                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                            AIRSPACE
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterHubs((prev) => !prev)}
                            className={`px-2.5 py-1 text-xs font-mono font-semibold transition-all cursor-pointer rounded ${
                                filterHubs
                                    ? "bg-slate-800 text-white shadow-xs"
                                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                            HUBS
                        </button>

                        <div className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center text-slate-400 ml-1">
                            <Crosshair className="w-3.5 h-3.5" />
                        </div>
                    </div>
                </div>
            }
            overlay={
                <>
                    <div className="absolute top-4 left-4 z-30 flex items-center gap-1.5 p-1 rounded-md bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-md text-xs font-mono">
                        <button
                            type="button"
                            onClick={handleForesight}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors cursor-pointer ${
                                showForesight
                                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                                    : "text-slate-200 hover:text-white hover:bg-slate-800"
                            }`}
                        >
                            <Eye className="w-3.5 h-3.5 text-cyan-400" />
                            <span>FORESIGHT</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleRunDemo}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                            <Play className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{isDemoRunning ? "Stop Demo" : "Run Demo"}</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                            <span>Reset</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleVoice}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                            <Mic className="w-3.5 h-3.5 text-slate-400" />
                            <span>Voice</span>
                        </button>
                    </div>

                    <div className="absolute bottom-4 right-4 z-30 flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-700/80 text-[11px] font-mono text-slate-300 pointer-events-none">
                        <span>LAT 16°04&apos;N</span>
                        <span className="text-slate-600">|</span>
                        <span>LON 108°13&apos;E</span>
                        <span className="text-slate-600">|</span>
                        {activeTelemetryCount > 0 ? (
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span>
                                    {activeTelemetryCount} LIVE{" "}
                                    {isSocketConnected ? "(WS)" : "(POLL)"}
                                </span>
                            </span>
                        ) : isSocketConnected ? (
                            <span className="text-cyan-400 font-medium">● WS READY</span>
                        ) : (
                            <span className="text-slate-400 font-medium">○ STANDBY</span>
                        )}
                    </div>
                </>
            }
        >
            {filterTraffic && (
                <>
                    <FlightsLayer flights={flights} autoFitBounds={false} />
                    <LiveTelemetryLayer
                        flights={activeFlights.length > 0 ? activeFlights : flights}
                        telemetryMap={telemetryMap}
                        telemetryHistoryMap={telemetryHistoryMap}
                        showPlannedRoute={showForesight}
                    />
                </>
            )}
            {filterHubs && <HubsLayer hubs={hubs} autoFitBounds={false} />}
            {filterAirspace && <AirspaceLayer zones={airspaceZones} autoFitBounds={false} />}
            <PerspectiveResetHandler hubs={hubs} trigger={resetTrigger} />
        </TacticalMapContainer>
    );
}

export default DashboardTacticalMap;

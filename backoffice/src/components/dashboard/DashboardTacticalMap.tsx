"use client";

import { useState, useEffect, useRef } from "react";
import { Eye, RotateCcw } from "lucide-react";
import {
    TacticalMapContainer,
    FlightsLayer,
    HubsLayer,
    AirspaceLayer,
    LiveTelemetryLayer,
    useCesium,
    fitCameraToBounds,
} from "@/components/map";
import { cn } from "@/lib";
import type { Flight, Hub, AirspaceZone, TelemetryRecord } from "@/types";
import { toast } from "sonner";

export interface DashboardTacticalMapProps {
    flights: Flight[];
    activeFlights?: Flight[];
    hubs: Hub[];
    airspaceZones: AirspaceZone[];
    telemetryMap?: Record<string, TelemetryRecord>;
    activeTelemetryCount?: number;
    isSocketConnected?: boolean;
}

function PerspectiveResetHandler({ hubs, trigger }: { hubs: Hub[]; trigger: number }) {
    const { viewer, isLoaded } = useCesium();
    const hasInitialFitRef = useRef(false);

    useEffect(() => {
        if (!viewer || !isLoaded) return;
        if (trigger === 0 && hasInitialFitRef.current) return;

        const points = hubs.flatMap((h) =>
            h.location && h.location.latitude !== undefined && h.location.longitude !== undefined
                ? [{ lat: h.location.latitude, lng: h.location.longitude }]
                : []
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
    airspaceZones = [],
    telemetryMap = {},
    activeTelemetryCount = 0,
    isSocketConnected = false,
}: DashboardTacticalMapProps) {
    const [filterTraffic, setFilterTraffic] = useState(true);
    const [filterAirspace, setFilterAirspace] = useState(true);
    const [filterHubs, setFilterHubs] = useState(true);
    const [showForesight, setShowForesight] = useState(false);
    const [resetTrigger, setResetTrigger] = useState(0);

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

    return (
        <TacticalMapContainer
            initialLayerType="satellite"
            className="w-full"
            header={
                <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-panel)] z-10">
                    <span className="text-xs font-bold font-mono tracking-wider text-[var(--color-text-primary)] uppercase">
                        TACTICAL MAP
                    </span>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setFilterTraffic((prev) => !prev)}
                            className={cn(
                                "px-2.5 py-1 text-xs font-mono font-semibold transition-all cursor-pointer rounded",
                                filterTraffic
                                    ? "bg-[var(--color-border-dark)] text-white shadow-2xs"
                                    : "border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)]"
                            )}
                        >
                            LIVE TRAFFIC
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterAirspace((prev) => !prev)}
                            className={cn(
                                "px-2.5 py-1 text-xs font-mono font-semibold transition-all cursor-pointer rounded",
                                filterAirspace
                                    ? "bg-[var(--color-border-dark)] text-white shadow-2xs"
                                    : "border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)]"
                            )}
                        >
                            AIRSPACE
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterHubs((prev) => !prev)}
                            className={cn(
                                "px-2.5 py-1 text-xs font-mono font-semibold transition-all cursor-pointer rounded",
                                filterHubs
                                    ? "bg-[var(--color-border-dark)] text-white shadow-2xs"
                                    : "border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)]"
                            )}
                        >
                            HUBS
                        </button>
                    </div>
                </div>
            }
            overlay={
                <>
                    <div className="absolute top-4 left-4 z-30 flex items-center gap-1.5 p-1 rounded-md bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-md text-xs font-mono">
                        <button
                            type="button"
                            onClick={handleForesight}
                            className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors cursor-pointer",
                                showForesight
                                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                                    : "text-slate-200 hover:text-white hover:bg-slate-800"
                            )}
                        >
                            <Eye className="w-3.5 h-3.5 text-cyan-400" />
                            <span>FORESIGHT</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                            <span>Reset</span>
                        </button>
                    </div>

                    <div className="absolute bottom-4 right-4 z-30 flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-700/80 text-[11px] font-mono text-slate-300 pointer-events-none">
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
                    />
                </>
            )}
            {filterHubs && <HubsLayer hubs={hubs} autoFitBounds={false} />}
            {filterAirspace && <AirspaceLayer zones={airspaceZones} autoFitBounds={false} />}
            <PerspectiveResetHandler hubs={hubs} trigger={resetTrigger} />
        </TacticalMapContainer>
    );
}

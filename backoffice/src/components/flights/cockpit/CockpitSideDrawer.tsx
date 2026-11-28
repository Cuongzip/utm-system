"use client";

import { memo, useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Activity, ShieldAlert, Terminal, X } from "lucide-react";
import { AltitudeProfile } from "@/components/map";
import {
    useConflictsActive,
    useEmergencyActiveIncidents,
    useEntityCodeMap,
    useFlightCommands,
} from "@/hooks";
import { cn } from "@/lib";
import { computeLiveAltitudeProgress, type RouteDistanceNode } from "../routeProgressUtils";
import type { AirspaceZone, Flight, Hub, TelemetryRecord } from "@/types";
import { CockpitCommandLogPanel } from "./CockpitCommandLogPanel";
import { CockpitSafetyPanel, type OnboardDiagnosticFlag } from "./CockpitSafetyPanel";

type CockpitDrawerTab = "commands" | "safety" | "profile" | null;

interface CockpitSideDrawerProps {
    flight: Flight;
    hubs: Hub[];
    departureHub: Hub | null;
    arrivalHub: Hub | null;
    airspaceZones: AirspaceZone[];
    telemetry: TelemetryRecord | null;
    timeline: TelemetryRecord[];
    visibleTrail: TelemetryRecord[];
    routeDistanceNodes: RouteDistanceNode[];
}

export const CockpitSideDrawer = memo(function CockpitSideDrawer({
    flight,
    hubs,
    departureHub,
    arrivalHub,
    airspaceZones,
    telemetry,
    timeline,
    visibleTrail,
    routeDistanceNodes,
}: CockpitSideDrawerProps) {
    const t = useTranslations("flights.deck");
    const tc = useTranslations("common");
    const entityMap = useEntityCodeMap();

    const { data: flightCommands = [] } = useFlightCommands(flight.id, Boolean(flight.id));
    const { data: activeConflicts = [] } = useConflictsActive();
    const { data: activeIncidents = [] } = useEmergencyActiveIncidents();

    const hubCodeMap = useMemo(() => {
        const m = new Map<string, string>();
        for (const h of hubs) {
            if (h.id) m.set(h.id, h.code || h.name || h.id);
        }
        return m;
    }, [hubs]);

    const sortedCommands = useMemo(() => {
        return [...flightCommands].sort((a, b) => {
            const tA = Date.parse(a.issuedAt || a.createdOn || "") || 0;
            const tB = Date.parse(b.issuedAt || b.createdOn || "") || 0;
            return tB - tA;
        });
    }, [flightCommands]);

    const flightConflicts = useMemo(
        () =>
            activeConflicts.filter(
                (c) => c.primaryFlightId === flight.id || c.secondaryFlightId === flight.id
            ),
        [activeConflicts, flight.id]
    );

    const flightIncidents = useMemo(
        () =>
            activeIncidents.filter(
                (inc) =>
                    inc.flightId === flight.id ||
                    (!inc.flightId && Boolean(flight.droneId) && inc.droneId === flight.droneId)
            ),
        [activeIncidents, flight.id, flight.droneId]
    );

    const onboardFlags = useMemo<OnboardDiagnosticFlag[]>(() => {
        const errs = (telemetry?.errors ?? []).map((msg) => ({ level: "error" as const, msg }));
        const warns = (telemetry?.warnings ?? []).map((msg) => ({
            level: "warning" as const,
            msg,
        }));
        return [...errs, ...warns];
    }, [telemetry]);

    const safetyCount = flightConflicts.length + flightIncidents.length + onboardFlags.length;

    const [prevFlightId, setPrevFlightId] = useState(flight.id);
    const [openTab, setOpenTab] = useState<CockpitDrawerTab>(null);
    const [autoOpenedSafety, setAutoOpenedSafety] = useState(false);

    // Only run the 800-point route projection when the 4D Profile tab is actually visible.
    const liveAltitudeProgress = useMemo(
        () =>
            openTab === "profile"
                ? computeLiveAltitudeProgress(
                      telemetry,
                      timeline,
                      visibleTrail,
                      routeDistanceNodes,
                      false
                  )
                : null,
        [openTab, telemetry, timeline, visibleTrail, routeDistanceNodes]
    );

    if (flight.id !== prevFlightId) {
        setPrevFlightId(flight.id);
        setAutoOpenedSafety(false);
        setOpenTab(null);
    }

    if (safetyCount > 0 && !autoOpenedSafety) {
        setAutoOpenedSafety(true);
        setOpenTab("safety");
    }

    useEffect(() => {
        if (openTab === null) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setOpenTab(null);
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [openTab]);

    const toggleTab = (tab: Exclude<CockpitDrawerTab, null>) => {
        setOpenTab((prev) => (prev === tab ? null : tab));
    };

    return (
        <div className="absolute top-14 right-3.5 z-30 flex flex-col items-end gap-2 max-w-[calc(100vw-1.75rem)] pointer-events-none">
            <div className="flex flex-wrap items-center justify-end gap-1.5 pointer-events-auto">
                <button
                    type="button"
                    aria-pressed={openTab === "commands"}
                    onClick={() => toggleTab("commands")}
                    className={cn(
                        "h-8 px-2.5 rounded-md border text-[11px] font-mono font-semibold inline-flex items-center gap-1.5 backdrop-blur-md shadow-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                        openTab === "commands"
                            ? "bg-slate-200 border-slate-200 text-slate-950 font-bold"
                            : "bg-slate-900/90 border-slate-700/80 text-slate-200 hover:bg-slate-800 hover:text-white"
                    )}
                >
                    <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>
                        {t("drawerCommands")} ({sortedCommands.length})
                    </span>
                </button>

                <button
                    type="button"
                    aria-pressed={openTab === "safety"}
                    onClick={() => toggleTab("safety")}
                    className={cn(
                        "h-8 px-2.5 rounded-md border text-[11px] font-mono font-semibold inline-flex items-center gap-1.5 backdrop-blur-md shadow-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                        openTab === "safety"
                            ? "bg-slate-200 border-slate-200 text-slate-950 font-bold"
                            : safetyCount > 0
                              ? "bg-red-950/90 border-red-600/80 text-red-100 hover:bg-red-900/90"
                              : "bg-slate-900/90 border-slate-700/80 text-slate-200 hover:bg-slate-800 hover:text-white"
                    )}
                >
                    <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t("tabSafety")}</span>
                    {safetyCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-bold leading-tight">
                            {safetyCount}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    aria-pressed={openTab === "profile"}
                    onClick={() => toggleTab("profile")}
                    className={cn(
                        "h-8 px-2.5 rounded-md border text-[11px] font-mono font-semibold inline-flex items-center gap-1.5 backdrop-blur-md shadow-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                        openTab === "profile"
                            ? "bg-slate-200 border-slate-200 text-slate-950 font-bold"
                            : "bg-slate-900/90 border-slate-700/80 text-slate-200 hover:bg-slate-800 hover:text-white"
                    )}
                >
                    <Activity className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t("drawerProfile4d")}</span>
                </button>
            </div>

            {openTab !== null && (
                <div className="w-[calc(100vw-1.75rem)] sm:w-[360px] max-h-[calc(100vh-14rem)] rounded-md border border-slate-700/85 bg-slate-900/95 text-slate-100 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col pointer-events-auto">
                    <div className="px-3 py-2 border-b border-slate-700/80 flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-200">
                            {openTab === "commands"
                                ? t("flightCommandLog")
                                : openTab === "safety"
                                  ? t("tabSafety")
                                  : t("drawerProfile4d")}
                        </span>
                        <button
                            type="button"
                            onClick={() => setOpenTab(null)}
                            aria-label={tc("close")}
                            className="w-6 h-6 rounded hover:bg-slate-800 inline-flex items-center justify-center text-slate-400 hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        >
                            <X className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                    </div>

                    {openTab === "commands" && (
                        <CockpitCommandLogPanel
                            flight={flight}
                            sortedCommands={sortedCommands}
                            hubCodeMap={hubCodeMap}
                            entityMap={entityMap}
                        />
                    )}

                    {openTab === "safety" && (
                        <CockpitSafetyPanel
                            flight={flight}
                            flightIncidents={flightIncidents}
                            flightConflicts={flightConflicts}
                            onboardFlags={onboardFlags}
                            safetyCount={safetyCount}
                            entityMap={entityMap}
                        />
                    )}

                    {openTab === "profile" && (
                        <AltitudeProfile
                            waypoints={flight.waypoints ?? []}
                            selectedWaypointId={null}
                            onWaypointClick={() => {}}
                            onPointClick={() => {}}
                            departureHub={departureHub}
                            arrivalHub={arrivalHub}
                            airspaceZones={airspaceZones}
                            liveProgress={liveAltitudeProgress}
                            cruisingAltitudeM={flight.cruisingAltitudeM}
                            tone="dark"
                            hideHeader
                        />
                    )}
                </div>
            )}
        </div>
    );
});

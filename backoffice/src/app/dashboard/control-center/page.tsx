"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { PageHeader } from "@/components/ui";
import { Building2, Navigation, Radio } from "lucide-react";
import {
    TacticalMapPanel,
    LiveTelemetry,
    FlightControl,
    RecentCommands,
    ActiveAlerts,
} from "@/components/control-center";
import { HubsLayer, LiveTelemetryLayer, type FlightHubCoord } from "@/components/map";
import { flightService, hubService, telemetryService } from "@/services";
import type { Flight, Hub, TelemetryRecord } from "@/types";

export default function ControlCenterPage() {
    const [flights, setFlights] = useState<Flight[]>([]);
    const [hubs, setHubs] = useState<Hub[]>([]);
    const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
    const [telemetryMap, setTelemetryMap] = useState<Record<string, TelemetryRecord>>({});
    const [telemetryHistoryMap, setTelemetryHistoryMap] = useState<
        Record<string, TelemetryRecord[]>
    >({});
    const [isLoading, setIsLoading] = useState(true);

    const loadFlightsAndHubs = useCallback(async () => {
        try {
            const [fetchedFlights, fetchedHubs] = await Promise.all([
                flightService.getAll(),
                hubService.getAll(),
            ]);

            setFlights(fetchedFlights);
            setHubs(fetchedHubs);

            if (fetchedFlights.length > 0) {
                const active = fetchedFlights.find(
                    (f) => f.status === "active" || (f.status as string) === "in_flight"
                );
                setSelectedFlightId((prev) => prev || (active ? active.id : fetchedFlights[0].id));
            }
        } catch (error) {
            console.error("Failed to load operations data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadFlightsAndHubs();
    }, [loadFlightsAndHubs]);

    const hubCoordsMap = useMemo(() => {
        const map = new Map<string, FlightHubCoord>();
        hubs.forEach((hub) => {
            if (hub.location?.lat !== undefined && hub.location?.lng !== undefined) {
                map.set(hub.id, {
                    lat: hub.location.lat,
                    lng: hub.location.lng,
                    name: hub.name,
                    code: hub.code,
                });
            }
        });
        return map;
    }, [hubs]);

    const isPollingRef = useRef(false);
    useEffect(() => {
        if (flights.length === 0) return;

        let alive = true;

        const pollTelemetry = async () => {
            if (isPollingRef.current) return;
            isPollingRef.current = true;

            try {
                const promises = flights.map(async (flight) => {
                    const latest = await telemetryService.getLatestByFlightId(flight.id);
                    if (!latest && flight.droneId) {
                        return {
                            flightId: flight.id,
                            latest: await telemetryService.getLatestByDroneId(flight.droneId),
                        };
                    }
                    return { flightId: flight.id, latest };
                });

                const results = await Promise.all(promises);
                if (!alive) return;

                const newTelemetryMap: Record<string, TelemetryRecord> = {};
                const flightsWithTelemetry: string[] = [];

                results.forEach(({ flightId, latest }) => {
                    if (latest) {
                        newTelemetryMap[flightId] = latest;
                        flightsWithTelemetry.push(flightId);
                    }
                });

                setTelemetryMap((prev) => ({ ...prev, ...newTelemetryMap }));

                if (flightsWithTelemetry.length > 0) {
                    const historyPromises = flightsWithTelemetry.map(async (fId) => {
                        const history = await telemetryService.getHistoryByFlightId(fId);
                        return { flightId: fId, history };
                    });

                    const historyResults = await Promise.all(historyPromises);
                    if (!alive) return;

                    const newHistoryMap: Record<string, TelemetryRecord[]> = {};
                    historyResults.forEach(({ flightId, history }) => {
                        if (history && history.length > 0) {
                            newHistoryMap[flightId] = history;
                        }
                    });

                    setTelemetryHistoryMap((prev) => ({ ...prev, ...newHistoryMap }));
                }
            } catch (err) {
                console.error("Error polling telemetry records:", err);
            } finally {
                isPollingRef.current = false;
            }
        };

        pollTelemetry();
        const intervalId = setInterval(pollTelemetry, 1000);

        return () => {
            alive = false;
            clearInterval(intervalId);
        };
    }, [flights]);

    const activeTelemetryCount = Object.keys(telemetryMap).length;
    const selectedFlight = flights.find((f) => f.id === selectedFlightId);
    const selectedTelemetry = selectedFlightId ? telemetryMap[selectedFlightId] : null;

    const activeFlightsCount = flights.filter(
        (f) => f.status === "active" || (f.status as string) === "in_flight"
    ).length;

    return (
        <div className="p-8 space-y-6">
            <PageHeader title="Live Operations">
                <div className="flex items-center space-x-2 text-xs font-mono">
                    <span className="inline-flex items-center px-2.5 py-1 rounded border border-slate-200 bg-slate-50 text-slate-600 font-medium">
                        <Building2 className="h-3.5 w-3.5 mr-1 text-slate-500" />
                        {hubs.length} HUBS
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded border border-slate-300 bg-slate-100 text-slate-900 font-semibold">
                        <Navigation className="h-3.5 w-3.5 mr-1 text-slate-700 rotate-45" />
                        {activeFlightsCount > 0
                            ? `${activeFlightsCount} ACTIVE`
                            : `${flights.length} FLIGHTS`}
                    </span>
                    <span
                        className={`inline-flex items-center px-2.5 py-1 rounded border font-medium ${
                            activeTelemetryCount > 0
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold animate-pulse"
                                : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                    >
                        <Radio className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                        {activeTelemetryCount > 0
                            ? `${activeTelemetryCount} TELEMETRY LIVE`
                            : "TELEMETRY STANDBY"}
                    </span>
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                    <TacticalMapPanel
                        initialMode="globe"
                        activeTelemetryCount={activeTelemetryCount}
                        onEntityClick={(entityId) => {
                            const rawId = entityId
                                .replace(/^drone-live-/, "")
                                .replace(/^drone-heading-/, "")
                                .replace(/^flight-planned-/, "")
                                .replace(/^flight-history-/, "");
                            const found = flights.find((f) => f.id === rawId);
                            if (found) {
                                setSelectedFlightId(found.id);
                            }
                        }}
                    >
                        <LiveTelemetryLayer
                            flights={flights}
                            telemetryMap={telemetryMap}
                            telemetryHistoryMap={telemetryHistoryMap}
                            selectedFlightId={selectedFlightId}
                            onSelectFlight={setSelectedFlightId}
                            hubCoordsMap={hubCoordsMap}
                        />
                        <HubsLayer hubs={hubs} />
                    </TacticalMapPanel>
                </div>

                <div className="lg:col-span-4">
                    <LiveTelemetry
                        telemetry={selectedTelemetry}
                        flight={selectedFlight}
                        flights={flights}
                        selectedFlightId={selectedFlightId}
                        onSelectFlight={setSelectedFlightId}
                        telemetryMap={telemetryMap}
                        onReloadFlights={loadFlightsAndHubs}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FlightControl
                    uavId={selectedFlight?.droneId || selectedFlight?.flightNumber || "UAV-STANDBY"}
                    statusText={
                        selectedFlight
                            ? `${selectedFlight.flightNumber || selectedFlight.id.slice(0, 8)} • ${(selectedFlight.status || "ready").toUpperCase()}`
                            : "Ready for control"
                    }
                />
                <RecentCommands />
                <ActiveAlerts />
            </div>
        </div>
    );
}

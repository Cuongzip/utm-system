"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { PageHeader } from "@/components/ui";
import { Building2, Navigation, Radio } from "lucide-react";
import {
    LiveTelemetry,
    FlightControl,
    RecentCommands,
    ActiveAlerts,
} from "@/components/control-center";
import {
    HubsLayer,
    LiveTelemetryLayer,
    FlightsLayer,
    TacticalMapContainer,
    useCesium,
    fitCameraToBounds,
} from "@/components/map";
import { useLiveTelemetry, useFlightsAll, useHubsAll } from "@/hooks";
import type { Flight, Hub } from "@/types";

function PerspectiveResetHandler({ hubs, flights }: { hubs: Hub[]; flights: Flight[] }) {
    const { viewer, isLoaded } = useCesium();
    const hasInitialFitRef = useRef(false);

    useEffect(() => {
        if (!viewer || !isLoaded || hasInitialFitRef.current) return;

        const hubPoints = hubs
            .filter((h) => h.location?.lat !== undefined && h.location?.lng !== undefined)
            .map((h) => ({ lat: h.location!.lat, lng: h.location!.lng }))
            .filter((pt) => pt.lat >= 8 && pt.lat <= 24 && pt.lng >= 100 && pt.lng <= 112);

        const flightPoints = flights
            .flatMap((f) => ((f.plannedRoute as any)?.coordinates as number[][] | undefined) ?? [])
            .filter((pt) => Array.isArray(pt) && pt.length >= 2 && !isNaN(pt[0]) && !isNaN(pt[1]))
            .map((pt) => ({ lng: Number(pt[0]), lat: Number(pt[1]) }))
            .filter((pt) => pt.lat >= 8 && pt.lat <= 24 && pt.lng >= 100 && pt.lng <= 112);

        const points = [...hubPoints, ...flightPoints];

        if (points.length > 0) {
            hasInitialFitRef.current = true;
            fitCameraToBounds(viewer, points, {
                animate: false,
                duration: 1.0,
                minHeight: 2500,
                paddingMultiplier: 1.4,
            });
        }
    }, [viewer, isLoaded, hubs, flights]);

    return null;
}

export default function ControlCenterPage() {
    const { data: allFlights = [], refetch: refetchFlights } = useFlightsAll();
    const { data: hubs = [], refetch: refetchHubs } = useHubsAll();
    const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);

    const reloadFlightsAndHubs = useCallback(async () => {
        await Promise.all([refetchFlights(), refetchHubs()]);
    }, [refetchFlights, refetchHubs]);

    const flights = useMemo(() => {
        return allFlights.filter((f) => {
            const s = (f.status || "").toLowerCase().replace(/[\s-]+/g, "_");
            return (
                s === "active" || s === "in_flight" || s === "diverted" || s === "emergency_landing"
            );
        });
    }, [allFlights]);

    useEffect(() => {
        if (flights.length > 0) {
            setSelectedFlightId((prev) =>
                prev && flights.some((f) => f.id === prev) ? prev : flights[0].id
            );
        } else if (allFlights.length > 0) {
            setSelectedFlightId((prev) =>
                prev && allFlights.some((f) => f.id === prev) ? prev : allFlights[0].id
            );
        } else {
            setSelectedFlightId(null);
        }
    }, [flights, allFlights]);

    const { telemetryMap, activeTelemetryCount, isSocketConnected } = useLiveTelemetry(flights);

    const selectedFlight = allFlights.find((f) => f.id === selectedFlightId);
    const selectedTelemetry = selectedFlightId ? telemetryMap[selectedFlightId] : null;

    const activeFlightsCount = flights.length;

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
                        {activeFlightsCount > 0 ? `${activeFlightsCount} ACTIVE` : "0 ACTIVE"}
                    </span>
                    <span
                        className={`inline-flex items-center px-2.5 py-1 rounded border font-medium ${
                            activeTelemetryCount > 0
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold animate-pulse"
                                : isSocketConnected
                                  ? "border-sky-300 bg-sky-50 text-sky-700 font-medium"
                                  : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                    >
                        <Radio className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                        {activeTelemetryCount > 0
                            ? `${activeTelemetryCount} TELEMETRY LIVE${isSocketConnected ? " (WS)" : ""}`
                            : isSocketConnected
                              ? "WS CONNECTED • STANDBY"
                              : "TELEMETRY STANDBY"}
                    </span>
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                    <TacticalMapContainer
                        initialMode="2d"
                        initialLayerType="satellite"
                        className="h-[540px]"
                        onEntityClick={(entityId) => {
                            const rawId = entityId
                                .replace(/^drone-live-/, "")
                                .replace(/^drone-heading-/, "")
                                .replace(/^flight-route-/, "")
                                .replace(/^flight-label-/, "");
                            const found = allFlights.find((f) => f.id === rawId);
                            if (found) {
                                setSelectedFlightId(found.id);
                            }
                        }}
                    >
                        <FlightsLayer
                            flights={allFlights}
                            selectedFlightId={selectedFlightId}
                            hubs={hubs}
                            autoFitBounds={false}
                            focusOnSelected={true}
                            showEndpoints={false}
                        />
                        <LiveTelemetryLayer
                            flights={flights.length > 0 ? flights : allFlights}
                            telemetryMap={telemetryMap}
                            selectedFlightId={selectedFlightId}
                            onSelectFlight={setSelectedFlightId}
                            autoFollowSelected={false}
                        />
                        <HubsLayer hubs={hubs} autoFitBounds={false} />
                        <PerspectiveResetHandler hubs={hubs} flights={allFlights} />
                    </TacticalMapContainer>
                </div>

                <div className="lg:col-span-4">
                    <LiveTelemetry
                        telemetry={selectedTelemetry}
                        flight={selectedFlight}
                        flights={flights.length > 0 ? flights : allFlights}
                        selectedFlightId={selectedFlightId}
                        onSelectFlight={setSelectedFlightId}
                        telemetryMap={telemetryMap}
                        onReloadFlights={reloadFlightsAndHubs}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FlightControl
                    droneId={selectedFlight?.droneId}
                    flightId={selectedFlight?.id}
                    uavId={selectedFlight?.droneId || selectedFlight?.flightNumber || "UAV-STANDBY"}
                    statusText={
                        selectedFlight
                            ? `${selectedFlight.flightNumber || selectedFlight.id.slice(0, 8)} • ${(selectedFlight.status || "ready").toUpperCase()}`
                            : "No active flight"
                    }
                />
                <RecentCommands droneId={selectedFlight?.droneId} />
                <ActiveAlerts />
            </div>
        </div>
    );
}

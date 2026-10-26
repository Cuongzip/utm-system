"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { PageHeader } from "@/components/ui";
import { Building2, Navigation, Radio, Crosshair } from "lucide-react";
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
    type FlightHubCoord,
} from "@/components/map";
import { useLiveTelemetry, useFlightsAll, useHubsAll } from "@/hooks";

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
        } else {
            setSelectedFlightId(null);
        }
    }, [flights]);

    const { telemetryMap, activeTelemetryCount, isSocketConnected } = useLiveTelemetry(flights);

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

    const selectedFlight = flights.find((f) => f.id === selectedFlightId);
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
                        icon={<Crosshair className="w-4 h-4 text-cyan-400" />}
                        title="LIVE OPERATIONS TRACKING"
                        activeCount={activeTelemetryCount}
                        initialMode="3d"
                        initialLayerType="satellite"
                        className="h-[540px]"
                        onEntityClick={(entityId) => {
                            const rawId = entityId
                                .replace(/^drone-live-/, "")
                                .replace(/^drone-heading-/, "")
                                .replace(/^flight-route-/, "")
                                .replace(/^flight-start-/, "")
                                .replace(/^flight-end-/, "")
                                .replace(/^flight-label-/, "");
                            const found = flights.find((f) => f.id === rawId);
                            if (found) {
                                setSelectedFlightId(found.id);
                            }
                        }}
                    >
                        <FlightsLayer
                            flights={flights}
                            selectedFlightId={selectedFlightId}
                            hubCoordsMap={hubCoordsMap}
                            autoFitBounds={true}
                            focusOnSelected={true}
                        />
                        <LiveTelemetryLayer
                            flights={flights}
                            telemetryMap={telemetryMap}
                            selectedFlightId={selectedFlightId}
                            onSelectFlight={setSelectedFlightId}
                        />
                        <HubsLayer hubs={hubs} />
                    </TacticalMapContainer>
                </div>

                <div className="lg:col-span-4">
                    <LiveTelemetry
                        telemetry={selectedTelemetry}
                        flight={selectedFlight}
                        flights={flights}
                        selectedFlightId={selectedFlightId}
                        onSelectFlight={setSelectedFlightId}
                        telemetryMap={telemetryMap}
                        onReloadFlights={reloadFlightsAndHubs}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FlightControl
                    uavId={selectedFlight?.droneId || selectedFlight?.flightNumber || "UAV-STANDBY"}
                    statusText={
                        selectedFlight
                            ? `${selectedFlight.flightNumber || selectedFlight.id.slice(0, 8)} • ${(selectedFlight.status || "ready").toUpperCase()}`
                            : "No active flight"
                    }
                />
                <RecentCommands />
                <ActiveAlerts />
            </div>
        </div>
    );
}

"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { PageHeader } from "@/components/ui";
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
            .filter(
                (h) => h.location?.latitude !== undefined && h.location?.longitude !== undefined
            )
            .map((h) => ({ lat: h.location!.latitude, lng: h.location!.longitude }))
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
    const { data: allFlights = [] } = useFlightsAll();
    const { data: hubs = [] } = useHubsAll();
    const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);

    const flights = useMemo(() => {
        return allFlights.filter((f) => {
            const s = (f.status || "").toLowerCase().replace(/[\s-]+/g, "_");
            return (
                s === "active" || s === "in_flight" || s === "diverted" || s === "emergency_landing"
            );
        });
    }, [allFlights]);

    const relevantHubs = useMemo(() => {
        if (flights.length === 0) return [];
        const activeHubIds = new Set<string>();
        for (const f of flights) {
            if (f.departureHubId) activeHubIds.add(f.departureHubId);
            if (f.arrivalHubId) activeHubIds.add(f.arrivalHubId);
        }
        return hubs.filter((h) => activeHubIds.has(h.id));
    }, [flights, hubs]);

    useEffect(() => {
        if (flights.length > 0) {
            setSelectedFlightId((prev) =>
                prev && flights.some((f) => f.id === prev) ? prev : flights[0].id
            );
        } else {
            setSelectedFlightId(null);
        }
    }, [flights]);

    const { telemetryMap } = useLiveTelemetry(flights);

    const selectedFlight = flights.find((f) => f.id === selectedFlightId);
    const selectedTelemetry = selectedFlightId ? telemetryMap[selectedFlightId] : null;

    return (
        <div className="p-8 space-y-6">
            <PageHeader title="Live Operations" />

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
                            const found = flights.find((f) => f.id === rawId);
                            if (found) {
                                setSelectedFlightId(found.id);
                            }
                        }}
                    >
                        <FlightsLayer
                            flights={flights}
                            selectedFlightId={selectedFlightId}
                            hubs={hubs}
                            autoFitBounds={false}
                            focusOnSelected={true}
                            showEndpoints={false}
                        />
                        <LiveTelemetryLayer
                            flights={flights}
                            telemetryMap={telemetryMap}
                            selectedFlightId={selectedFlightId}
                            onSelectFlight={setSelectedFlightId}
                            autoFollowSelected={false}
                        />
                        <HubsLayer hubs={relevantHubs} autoFitBounds={false} />
                        <PerspectiveResetHandler hubs={relevantHubs} flights={flights} />
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
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FlightControl droneId={selectedFlight?.droneId} flightId={selectedFlight?.id} />
                <RecentCommands droneId={selectedFlight?.droneId} />
                <ActiveAlerts />
            </div>
        </div>
    );
}

"use client";

import { PlaneTakeoff } from "lucide-react";
import { StatusBadge } from "@/components/ui";
import {
    TacticalMapContainer,
    FlightsLayer,
    MapInspector,
    type FlightHubCoord,
} from "@/components/map";
import type { Flight } from "@/types";

export interface FlightsMapProps {
    flights: Flight[];
    selectedFlightId?: string | null;
    onSelectFlight?: (flight: Flight | null) => void;
    hubMap?: Map<string, string>;
    hubCoordsMap?: Map<string, FlightHubCoord>;
    droneMap?: Map<string, string>;
}

export function FlightsMap({
    flights = [],
    selectedFlightId,
    onSelectFlight,
    hubMap = new Map(),
    hubCoordsMap = new Map(),
    droneMap = new Map(),
}: FlightsMapProps) {
    const selectedFlight = flights.find((f) => f.id === selectedFlightId);
    const activeFlightsCount = flights.filter(
        (f) => f.status === "active" || (f.status as string) === "in_flight"
    ).length;

    type ExtendedFlight = Flight & {
        drone?: { registrationNumber?: string; model?: string };
        departureHub?: { name?: string };
        arrivalHub?: { name?: string };
    };
    const flightDetails = selectedFlight as ExtendedFlight | undefined;

    const droneName = flightDetails
        ? flightDetails.drone?.registrationNumber ||
          flightDetails.drone?.model ||
          (flightDetails.droneId
              ? droneMap.get(flightDetails.droneId) || flightDetails.droneId.slice(0, 8)
              : "—")
        : "—";

    const depName = flightDetails
        ? flightDetails.departureHub?.name ||
          (flightDetails.departureHubId
              ? hubMap.get(flightDetails.departureHubId) || flightDetails.departureHubId
              : "—")
        : "—";

    const arrName = flightDetails
        ? flightDetails.arrivalHub?.name ||
          (flightDetails.arrivalHubId
              ? hubMap.get(flightDetails.arrivalHubId) || flightDetails.arrivalHubId
              : "—")
        : "—";

    return (
        <TacticalMapContainer
            icon={<PlaneTakeoff className="w-4 h-4 text-cyan-400" />}
            title="FLIGHT TRAJECTORY MAP"
            badge={`${activeFlightsCount} ${activeFlightsCount === 1 ? "FLIGHT" : "FLIGHTS"} ACTIVE`}
            onEntityClick={(entityId) => {
                const rawId = entityId
                    .replace(/^flight-route-/, "")
                    .replace(/^flight-start-/, "")
                    .replace(/^flight-end-/, "")
                    .replace(/^flight-label-/, "");
                const found = flights.find((f) => f.id === rawId);
                if (found && onSelectFlight) {
                    onSelectFlight(found);
                }
            }}
            inspector={
                selectedFlight ? (
                    <MapInspector
                        code={selectedFlight.flightNumber || selectedFlight.id.slice(0, 8)}
                        badge={
                            <StatusBadge
                                status={selectedFlight.status || "planned"}
                                showDot={true}
                            />
                        }
                        metaItems={[
                            { label: "Drone", value: droneName },
                            { label: "Route", value: `${depName} → ${arrName}` },
                            {
                                label: "Altitude",
                                value: `${selectedFlight.cruisingAltitudeM ?? 120}m`,
                            },
                        ]}
                        accentColor="default"
                        onClose={() => onSelectFlight?.(null)}
                        closeTooltip="Close flight inspector"
                    />
                ) : null
            }
        >
            <FlightsLayer
                flights={flights}
                selectedFlightId={selectedFlightId}
                hubCoordsMap={hubCoordsMap}
            />
        </TacticalMapContainer>
    );
}

export default FlightsMap;

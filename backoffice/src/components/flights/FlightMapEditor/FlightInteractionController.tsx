"use client";

import { RouteWaypointInteractionController } from "@/components/waypoints/RouteWaypointInteractionController";
import type { FlightWaypoint } from "../useFlightRoute";

export type FlightEditorMode = "select" | "add";

interface FlightInteractionControllerProps {
    mode: FlightEditorMode;
    cruisingAltitude: number;
    waypoints: FlightWaypoint[];
    isReadOnly: boolean;
    onAddWaypoint: (lat: number, lng: number, altitude: number) => void;
    onMoveWaypoint: (id: string, lat: number, lng: number) => void;
    onSelectWaypoint: (waypoint: FlightWaypoint | null) => void;
}

const FLIGHT_HUB_ENTITY_IDS = ["flight-dep-hub", "flight-arr-hub"] as const;

export function FlightInteractionController({
    mode,
    cruisingAltitude,
    waypoints,
    isReadOnly = false,
    onAddWaypoint,
    onMoveWaypoint,
    onSelectWaypoint,
}: FlightInteractionControllerProps) {
    return (
        <RouteWaypointInteractionController
            entityPrefix="flight-wp-"
            ignoredEntityIds={FLIGHT_HUB_ENTITY_IDS}
            isAddActive={mode === "add"}
            defaultAltitude={cruisingAltitude}
            waypoints={waypoints}
            isReadOnly={isReadOnly}
            onAddWaypoint={onAddWaypoint}
            onMoveWaypoint={onMoveWaypoint}
            onSelectWaypoint={onSelectWaypoint}
        />
    );
}

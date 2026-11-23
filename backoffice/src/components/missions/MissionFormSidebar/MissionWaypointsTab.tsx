"use client";

import type { Waypoint, Hub } from "@/types";
import { WaypointRouteTab } from "@/components/waypoints";

export interface MissionWaypointsTabProps {
    waypoints: Waypoint[];
    selectedWaypoint: Waypoint | null;
    onSelectWaypoint: (wp: Waypoint | null) => void;
    onUpdateWaypoint: (wp: Waypoint) => void;
    onDeleteWaypoint: (wpId: string) => void;
    onMoveWaypointOrder: (fromIndex: number, toIndex: number) => void;
    departureHub?: Hub | null;
    arrivalHub?: Hub | null;
    isReadOnly?: boolean;
    fieldErrors?: Record<string, string>;
    onClearFieldError?: (field: string) => void;
}

export function MissionWaypointsTab({
    waypoints = [],
    selectedWaypoint,
    onSelectWaypoint,
    onUpdateWaypoint,
    onDeleteWaypoint,
    onMoveWaypointOrder,
    departureHub,
    arrivalHub,
    isReadOnly = false,
    fieldErrors = {},
    onClearFieldError,
}: MissionWaypointsTabProps) {
    return (
        <WaypointRouteTab
            title="Mission Route Checkpoints"
            waypoints={waypoints}
            selectedWaypoint={selectedWaypoint}
            onSelectWaypoint={onSelectWaypoint}
            onUpdateWaypoint={onUpdateWaypoint}
            onDeleteWaypoint={onDeleteWaypoint}
            onMoveWaypointOrder={onMoveWaypointOrder}
            departureHub={departureHub}
            arrivalHub={arrivalHub}
            defaultAltitude={50}
            isReadOnly={isReadOnly}
            generalError={fieldErrors.waypoints}
            fieldErrors={fieldErrors}
            onClearFieldError={onClearFieldError}
        />
    );
}

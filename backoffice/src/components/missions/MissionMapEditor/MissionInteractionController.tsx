"use client";

import { RouteWaypointInteractionController } from "@/components/waypoints/RouteWaypointInteractionController";
import type { Waypoint } from "@/types";

export type EditorMode = "select" | "add" | "draw";

interface MissionInteractionControllerProps {
    mode: EditorMode;
    defaultAltitude: number;
    waypoints: Waypoint[];
    isReadOnly: boolean;
    onAddWaypoint: (lat: number, lng: number, altitude: number) => void;
    onMoveWaypoint: (wpId: string, lat: number, lng: number) => void;
    onSelectWaypoint: (waypoint: Waypoint | null) => void;
}

const MISSION_HUB_ENTITY_IDS = ["hub-dep-marker", "hub-arr-marker"] as const;

export function MissionInteractionController({
    mode,
    defaultAltitude,
    waypoints,
    isReadOnly = false,
    onAddWaypoint,
    onMoveWaypoint,
    onSelectWaypoint,
}: MissionInteractionControllerProps) {
    return (
        <RouteWaypointInteractionController
            entityPrefix="wp-"
            ignoredEntityIds={MISSION_HUB_ENTITY_IDS}
            isAddActive={mode === "add" || mode === "draw"}
            defaultAltitude={defaultAltitude}
            waypoints={waypoints}
            isReadOnly={isReadOnly}
            onAddWaypoint={onAddWaypoint}
            onMoveWaypoint={onMoveWaypoint}
            onSelectWaypoint={onSelectWaypoint}
        />
    );
}

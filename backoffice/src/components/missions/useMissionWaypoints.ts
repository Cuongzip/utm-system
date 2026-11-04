"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import type { Waypoint, Hub } from "@/types";
import { useWaypointManager } from "@/hooks/useWaypointManager";
import { calculateMissionDistance, generateHubToHubWaypoints } from "./missionUtils";

export interface UseMissionWaypointsOptions {
    initialWaypoints?: Waypoint[];
    initialAltitude?: number;
    isReadOnly?: boolean;
    departureHub?: Hub | null;
    arrivalHub?: Hub | null;
    onClearWaypointErrors?: () => void;
}

export function useMissionWaypoints({
    initialWaypoints = [],
    initialAltitude = 50,
    isReadOnly = false,
    departureHub,
    arrivalHub,
    onClearWaypointErrors,
}: UseMissionWaypointsOptions = {}) {
    const {
        waypoints,
        setWaypoints,
        selectedWaypointId,
        setSelectedWaypointId,
        selectedWaypoint,
        removeWaypoint: handleDeleteWaypoint,
        reorderWaypoints: handleMoveWaypointOrder,
        undoWaypoint: handleUndoWaypoint,
        clearWaypoints: handleClearWaypoints,
        matchesId,
    } = useWaypointManager<Waypoint>({
        initialWaypoints,
        isReadOnly,
        onClearErrors: onClearWaypointErrors,
    });

    const [defaultAltitude, setDefaultAltitude] = useState(initialAltitude);

    useEffect(() => {
        if (initialWaypoints && initialWaypoints.length > 0 && waypoints.length === 0) {
            setWaypoints(initialWaypoints);
        }
    }, [initialWaypoints, waypoints.length, setWaypoints]);

    const totalDistanceM = useMemo(
        () => calculateMissionDistance(waypoints, departureHub, arrivalHub),
        [waypoints, departureHub, arrivalHub]
    );

    const handleSelectWaypoint = useCallback(
        (wp: Waypoint | null) => {
            setSelectedWaypointId(wp ? String(wp.id || wp.tempId) : null);
        },
        [setSelectedWaypointId]
    );

    const handleAddWaypoint = useCallback(
        (lat: number, lng: number, altitude: number) => {
            if (isReadOnly) return;
            const nextSeq = waypoints.length + 1;
            const newWp: Waypoint = {
                tempId: `wp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                sequence: nextSeq,
                name: `Waypoint ${nextSeq}`,
                latitude: lat,
                longitude: lng,
                altitude: altitude || defaultAltitude,
            };
            setWaypoints((prev) => [...prev, newWp]);
            onClearWaypointErrors?.();
        },
        [isReadOnly, waypoints.length, defaultAltitude, onClearWaypointErrors, setWaypoints]
    );

    const handleUpdateWaypoint = useCallback(
        (updated: Waypoint) => {
            if (isReadOnly) return;
            setWaypoints((prev) =>
                prev.map((w) => {
                    const match =
                        (w.id && w.id === updated.id) || (w.tempId && w.tempId === updated.tempId);
                    return match ? updated : w;
                })
            );
        },
        [isReadOnly, setWaypoints]
    );

    const handleMoveWaypoint = useCallback(
        (wpId: string, lat: number, lng: number) => {
            if (isReadOnly) return;
            setWaypoints((prev) =>
                prev.map((wp) => {
                    if (matchesId(wp, wpId)) {
                        return { ...wp, latitude: lat, longitude: lng };
                    }
                    return wp;
                })
            );
        },
        [isReadOnly, matchesId, setWaypoints]
    );

    const handleGenerateHubToHub = useCallback(() => {
        if (isReadOnly) return;
        if (!departureHub?.location || !arrivalHub?.location) {
            toast.error("Please select both Departure Hub and Arrival Hub first");
            return;
        }

        const newWaypoints = generateHubToHubWaypoints(departureHub, arrivalHub, defaultAltitude);
        if (newWaypoints.length === 0) {
            toast.error("Selected hubs do not have valid GPS coordinates");
            return;
        }

        setWaypoints(newWaypoints);
        onClearWaypointErrors?.();
        toast.success(
            `Generated direct route from ${departureHub.code || departureHub.name} to ${arrivalHub.code || arrivalHub.name}`
        );
    }, [
        isReadOnly,
        departureHub,
        arrivalHub,
        defaultAltitude,
        onClearWaypointErrors,
        setWaypoints,
    ]);

    return {
        waypoints,
        setWaypoints,
        selectedWaypointId,
        setSelectedWaypointId,
        selectedWaypoint,
        defaultAltitude,
        setDefaultAltitude,
        totalDistanceM,
        handleAddWaypoint,
        handleUpdateWaypoint,
        handleDeleteWaypoint,
        handleSelectWaypoint,
        handleMoveWaypoint,
        handleMoveWaypointOrder,
        handleUndoWaypoint,
        handleClearWaypoints,
        handleGenerateHubToHub,
    };
}

export default useMissionWaypoints;

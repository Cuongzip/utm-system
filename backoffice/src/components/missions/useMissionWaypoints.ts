import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import type { Waypoint, Hub } from "@/types";
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
    const [waypoints, setWaypoints] = useState<Waypoint[]>(initialWaypoints);
    const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null);
    const [defaultAltitude, setDefaultAltitude] = useState(initialAltitude);

    const totalDistanceM = useMemo(
        () => calculateMissionDistance(waypoints, departureHub, arrivalHub),
        [waypoints, departureHub, arrivalHub]
    );

    const selectedWaypoint = useMemo(() => {
        if (!selectedWaypointId) return null;
        return (
            waypoints.find((w) => w.id === selectedWaypointId || w.tempId === selectedWaypointId) ||
            null
        );
    }, [waypoints, selectedWaypointId]);

    const handleSelectWaypoint = useCallback((wp: Waypoint | null) => {
        setSelectedWaypointId(wp ? String(wp.id || wp.tempId) : null);
    }, []);

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
        [isReadOnly, waypoints.length, defaultAltitude, onClearWaypointErrors]
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
        [isReadOnly]
    );

    const handleDeleteWaypoint = useCallback(
        (idOrTempId: string) => {
            if (isReadOnly) return;
            setWaypoints((prev) => {
                const filtered = prev.filter((w) => w.id !== idOrTempId && w.tempId !== idOrTempId);
                return filtered.map((w, idx) => ({ ...w, sequence: idx + 1 }));
            });
            setSelectedWaypointId((prev) => (prev === idOrTempId ? null : prev));
        },
        [isReadOnly]
    );

    const handleMoveWaypoint = useCallback(
        (wpId: string, lat: number, lng: number) => {
            if (isReadOnly) return;
            setWaypoints((prev) =>
                prev.map((wp) => {
                    if (String(wp.id || wp.tempId) === wpId) {
                        return { ...wp, latitude: lat, longitude: lng };
                    }
                    return wp;
                })
            );
        },
        [isReadOnly]
    );

    const handleMoveWaypointOrder = useCallback(
        (fromIndex: number, toIndex: number) => {
            if (isReadOnly) return;
            setWaypoints((prev) => {
                if (
                    fromIndex < 0 ||
                    fromIndex >= prev.length ||
                    toIndex < 0 ||
                    toIndex >= prev.length
                ) {
                    return prev;
                }
                const reordered = [...prev];
                const [moved] = reordered.splice(fromIndex, 1);
                reordered.splice(toIndex, 0, moved);
                return reordered.map((wp, idx) => ({
                    ...wp,
                    sequence: idx + 1,
                }));
            });
        },
        [isReadOnly]
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
    }, [isReadOnly, departureHub, arrivalHub, defaultAltitude, onClearWaypointErrors]);

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
        handleGenerateHubToHub,
    };
}

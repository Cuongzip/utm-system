"use client";

import { useState, useCallback, useMemo } from "react";

export interface BaseWaypointItem {
    id?: string;
    tempId?: string;
    sequence?: number;
}

export interface UseWaypointManagerOptions<T extends BaseWaypointItem> {
    initialWaypoints?: T[];
    isReadOnly?: boolean;
    onClearErrors?: () => void;
}

export function useWaypointManager<T extends BaseWaypointItem>({
    initialWaypoints = [],
    isReadOnly = false,
    onClearErrors,
}: UseWaypointManagerOptions<T> = {}) {
    const [waypoints, setWaypoints] = useState<T[]>(initialWaypoints);
    const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null);

    const matchesId = useCallback((item: T, targetId: string) => {
        return (
            (item.id && (item.id === targetId || `wp-${item.id}` === targetId)) ||
            (item.tempId && item.tempId === targetId)
        );
    }, []);

    const selectedWaypoint = useMemo(() => {
        if (!selectedWaypointId) return null;
        return waypoints.find((w) => matchesId(w, selectedWaypointId)) || null;
    }, [waypoints, selectedWaypointId, matchesId]);

    const removeWaypoint = useCallback(
        (id: string) => {
            if (isReadOnly) return;
            setWaypoints((prev) => {
                const filtered = prev.filter((w) => !matchesId(w, id));
                return filtered.map((w, idx) => ({ ...w, sequence: idx + 1 }));
            });
            setSelectedWaypointId((prev) => (prev === id ? null : prev));
            onClearErrors?.();
        },
        [isReadOnly, matchesId, onClearErrors]
    );

    const reorderWaypoints = useCallback(
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
                return reordered.map((wp, idx) => ({ ...wp, sequence: idx + 1 }));
            });
            onClearErrors?.();
        },
        [isReadOnly, onClearErrors]
    );

    const undoWaypoint = useCallback(() => {
        if (isReadOnly) return;
        setWaypoints((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
        setSelectedWaypointId(null);
        onClearErrors?.();
    }, [isReadOnly, onClearErrors]);

    const clearWaypoints = useCallback(() => {
        if (isReadOnly) return;
        setWaypoints([]);
        setSelectedWaypointId(null);
        onClearErrors?.();
    }, [isReadOnly, onClearErrors]);

    return {
        waypoints,
        setWaypoints,
        selectedWaypointId,
        setSelectedWaypointId,
        selectedWaypoint,
        removeWaypoint,
        reorderWaypoints,
        undoWaypoint,
        clearWaypoints,
        matchesId,
    };
}

export default useWaypointManager;

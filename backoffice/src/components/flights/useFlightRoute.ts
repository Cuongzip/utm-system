"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { Hub } from "@/types";
import { calculateFlightDistance, convertWaypointsToLineString } from "./flightUtils";

export interface FlightWaypoint {
    id: string;
    tempId?: string;
    sequence: number;
    name?: string;
    lat: number;
    lng: number;
    altitude: number;
}

export interface FlightLineStringGeometry {
    type: string;
    coordinates: number[][];
}

export interface UseFlightRouteOptions {
    initialRoute?: FlightLineStringGeometry | null;
    departureHub?: Hub | null;
    arrivalHub?: Hub | null;
    cruisingAltitude?: number;
    isReadOnly?: boolean;
    onClearErrors?: () => void;
}

export function useFlightRoute({
    initialRoute,
    departureHub,
    arrivalHub,
    cruisingAltitude = 120,
    isReadOnly = false,
    onClearErrors,
}: UseFlightRouteOptions) {
    const [waypoints, setWaypoints] = useState<FlightWaypoint[]>([]);
    const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null);
    const initializedRouteRef = useRef(false);

    useEffect(() => {
        if (initializedRouteRef.current) return;
        if (
            initialRoute?.coordinates &&
            Array.isArray(initialRoute.coordinates) &&
            initialRoute.coordinates.length > 0
        ) {
            initializedRouteRef.current = true;
            const coords = initialRoute.coordinates;
            const parsedWaypoints: FlightWaypoint[] = [];

            const isStartDep =
                departureHub?.location &&
                Math.abs(coords[0][0] - departureHub.location.lng) < 0.0001 &&
                Math.abs(coords[0][1] - departureHub.location.lat) < 0.0001;

            const isEndArr =
                arrivalHub?.location &&
                coords.length > 1 &&
                Math.abs(coords[coords.length - 1][0] - arrivalHub.location.lng) < 0.0001 &&
                Math.abs(coords[coords.length - 1][1] - arrivalHub.location.lat) < 0.0001;

            const startIndex = isStartDep ? 1 : 0;
            const endIndex = isEndArr ? coords.length - 1 : coords.length;

            for (let i = startIndex; i < endIndex; i++) {
                const pt = coords[i];
                if (Array.isArray(pt) && pt.length >= 2) {
                    const seq = parsedWaypoints.length + 1;
                    const idStr = `wp-init-${i}`;
                    parsedWaypoints.push({
                        id: idStr,
                        tempId: idStr,
                        sequence: seq,
                        name: `Waypoint ${seq}`,
                        lng: pt[0],
                        lat: pt[1],
                        altitude: pt[2] !== undefined ? pt[2] : cruisingAltitude,
                    });
                }
            }
            setWaypoints(parsedWaypoints);
        }
    }, [initialRoute, departureHub, arrivalHub, cruisingAltitude]);

    const selectedWaypoint = useMemo(() => {
        if (!selectedWaypointId) return null;
        return (
            waypoints.find(
                (w) =>
                    w.id === selectedWaypointId ||
                    w.tempId === selectedWaypointId ||
                    `wp-${w.id}` === selectedWaypointId
            ) || null
        );
    }, [waypoints, selectedWaypointId]);

    const addWaypoint = useCallback(
        (lat: number, lng: number, altitude?: number) => {
            if (isReadOnly) return;
            const seq = waypoints.length + 1;
            const idStr = `wp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            const newWp: FlightWaypoint = {
                id: idStr,
                tempId: idStr,
                sequence: seq,
                name: `Waypoint ${seq}`,
                lat,
                lng,
                altitude: altitude !== undefined ? altitude : cruisingAltitude,
            };
            setWaypoints((prev) => [...prev, newWp]);
            setSelectedWaypointId(idStr);
            onClearErrors?.();
        },
        [isReadOnly, waypoints.length, cruisingAltitude, onClearErrors]
    );

    const updateWaypoint = useCallback(
        (id: string, updates: Partial<FlightWaypoint>) => {
            if (isReadOnly) return;
            setWaypoints((prev) =>
                prev.map((wp) => {
                    if (wp.id === id || wp.tempId === id) {
                        return { ...wp, ...updates };
                    }
                    return wp;
                })
            );
            onClearErrors?.();
        },
        [isReadOnly, onClearErrors]
    );

    const moveWaypoint = useCallback(
        (id: string, lat: number, lng: number) => {
            if (isReadOnly) return;
            setWaypoints((prev) =>
                prev.map((wp) => {
                    if (wp.id === id || wp.tempId === id) {
                        return { ...wp, lat, lng };
                    }
                    return wp;
                })
            );
        },
        [isReadOnly]
    );

    const removeWaypoint = useCallback(
        (id: string) => {
            if (isReadOnly) return;
            setWaypoints((prev) => {
                const next = prev.filter((wp) => wp.id !== id && wp.tempId !== id);
                return next.map((wp, idx) => ({ ...wp, sequence: idx + 1 }));
            });
            setSelectedWaypointId((prev) => (prev === id ? null : prev));
            onClearErrors?.();
        },
        [isReadOnly, onClearErrors]
    );

    const moveWaypointOrder = useCallback(
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
            onClearErrors?.();
        },
        [isReadOnly, onClearErrors]
    );

    const clearWaypoints = useCallback(() => {
        if (isReadOnly) return;
        setWaypoints([]);
        setSelectedWaypointId(null);
        onClearErrors?.();
    }, [isReadOnly, onClearErrors]);

    const totalDistanceM = useMemo(() => {
        return calculateFlightDistance(waypoints, departureHub, arrivalHub, cruisingAltitude);
    }, [waypoints, departureHub, arrivalHub, cruisingAltitude]);

    const computedGeoJsonLineString = useMemo(() => {
        return convertWaypointsToLineString(waypoints, departureHub, arrivalHub, cruisingAltitude);
    }, [waypoints, departureHub, arrivalHub, cruisingAltitude]);

    return {
        waypoints,
        setWaypoints,
        selectedWaypointId,
        setSelectedWaypointId,
        selectedWaypoint,
        addWaypoint,
        updateWaypoint,
        moveWaypoint,
        removeWaypoint,
        moveWaypointOrder,
        clearWaypoints,
        totalDistanceM,
        computedGeoJsonLineString,
    };
}

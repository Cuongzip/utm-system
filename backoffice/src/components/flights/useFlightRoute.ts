"use client";

import { useMemo, useCallback, useEffect, useRef } from "react";
import type { Hub } from "@/types";
import { useWaypointManager } from "@/hooks/useWaypointManager";
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
    initialRoute?: FlightLineStringGeometry | string | null;
    departureHub?: Hub | null;
    arrivalHub?: Hub | null;
    cruisingAltitude?: number;
    isReadOnly?: boolean;
    onClearErrors?: () => void;
}

function parseInitialRouteWaypoints(
    initialRoute: unknown,
    departureHub?: Hub | null,
    arrivalHub?: Hub | null,
    cruisingAltitude = 120
): FlightWaypoint[] {
    let route = initialRoute as any;
    if (typeof route === "string") {
        try {
            route = JSON.parse(route);
        } catch {
            route = null;
        }
    }
    if (
        !route?.coordinates ||
        !Array.isArray(route.coordinates) ||
        route.coordinates.length === 0
    ) {
        return [];
    }

    const coords = route.coordinates;
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

    return parsedWaypoints;
}

export function useFlightRoute({
    initialRoute,
    departureHub,
    arrivalHub,
    cruisingAltitude = 120,
    isReadOnly = false,
    onClearErrors,
}: UseFlightRouteOptions) {
    const {
        waypoints,
        setWaypoints,
        selectedWaypointId,
        setSelectedWaypointId,
        selectedWaypoint,
        removeWaypoint,
        reorderWaypoints: moveWaypointOrder,
        undoWaypoint,
        clearWaypoints,
        matchesId,
    } = useWaypointManager<FlightWaypoint>({
        initialWaypoints: parseInitialRouteWaypoints(
            initialRoute,
            departureHub,
            arrivalHub,
            cruisingAltitude
        ),
        isReadOnly,
        onClearErrors,
    });

    const initializedRouteRef = useRef(false);

    useEffect(() => {
        if (initializedRouteRef.current) return;
        const parsed = parseInitialRouteWaypoints(
            initialRoute,
            departureHub,
            arrivalHub,
            cruisingAltitude
        );
        if (parsed.length > 0) {
            initializedRouteRef.current = true;
            setWaypoints(parsed);
        }
    }, [initialRoute, departureHub, arrivalHub, cruisingAltitude, setWaypoints]);

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
        [
            isReadOnly,
            waypoints.length,
            cruisingAltitude,
            onClearErrors,
            setWaypoints,
            setSelectedWaypointId,
        ]
    );

    const updateWaypoint = useCallback(
        (id: string, updates: Partial<FlightWaypoint>) => {
            if (isReadOnly) return;
            setWaypoints((prev) =>
                prev.map((wp) => (matchesId(wp, id) ? { ...wp, ...updates } : wp))
            );
            onClearErrors?.();
        },
        [isReadOnly, onClearErrors, matchesId, setWaypoints]
    );

    const moveWaypoint = useCallback(
        (id: string, lat: number, lng: number) => {
            if (isReadOnly) return;
            setWaypoints((prev) =>
                prev.map((wp) => (matchesId(wp, id) ? { ...wp, lat, lng } : wp))
            );
        },
        [isReadOnly, matchesId, setWaypoints]
    );

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
        undoWaypoint,
        clearWaypoints,
        totalDistanceM,
        computedGeoJsonLineString,
    };
}

export default useFlightRoute;

"use client";

import { useMemo, useCallback, useEffect, useRef } from "react";
import { WAYPOINT_ACTION_TYPE, type Hub, type FlightWaypoint } from "@/types";
import { useWaypointManager } from "@/hooks/useWaypointManager";
import { extractIntermediateWaypoints } from "@/components/waypoints";
import { calculateFlightDistance, convertWaypointsToLineString } from "./flightUtils";

export type { FlightWaypoint };

export interface FlightLineStringGeometry {
    type: string;
    coordinates: number[][];
}

export interface UseFlightRouteOptions {
    initialWaypoints?: FlightWaypoint[];
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
    let parsed: unknown = initialRoute;
    if (typeof parsed === "string") {
        try {
            parsed = JSON.parse(parsed);
        } catch {
            parsed = null;
        }
    }
    const route =
        parsed && typeof parsed === "object" ? (parsed as { coordinates?: unknown }) : null;
    if (
        !route?.coordinates ||
        !Array.isArray(route.coordinates) ||
        route.coordinates.length === 0
    ) {
        return [];
    }

    const coords = route.coordinates as number[][];
    const parsedWaypoints: FlightWaypoint[] = [];

    const isStartDep =
        departureHub?.location &&
        departureHub.location.longitude !== undefined &&
        departureHub.location.latitude !== undefined &&
        Math.abs(coords[0][0] - departureHub.location.longitude) < 0.0001 &&
        Math.abs(coords[0][1] - departureHub.location.latitude) < 0.0001;

    const isEndArr =
        arrivalHub?.location &&
        arrivalHub.location.longitude !== undefined &&
        arrivalHub.location.latitude !== undefined &&
        coords.length > 1 &&
        Math.abs(coords[coords.length - 1][0] - arrivalHub.location.longitude) < 0.0001 &&
        Math.abs(coords[coords.length - 1][1] - arrivalHub.location.latitude) < 0.0001;

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
                latitude: pt[1],
                longitude: pt[0],
                altitude: pt[2] ?? cruisingAltitude,
                actions: { type: WAYPOINT_ACTION_TYPE.FLY_THROUGH },
            });
        }
    }

    return parsedWaypoints;
}

export function useFlightRoute({
    initialWaypoints,
    initialRoute,
    departureHub,
    arrivalHub,
    cruisingAltitude = 120,
    isReadOnly = false,
    onClearErrors,
}: UseFlightRouteOptions) {
    const parsedInitial = useMemo(() => {
        if (initialWaypoints && Array.isArray(initialWaypoints) && initialWaypoints.length > 0) {
            const list = initialWaypoints.map((wp, idx) => ({
                ...wp,
                id: wp.id || `wp-init-${idx}`,
                tempId: wp.tempId || wp.id || `wp-init-${idx}`,
                sequence: wp.sequence ?? idx + 1,
                altitude: wp.altitude ?? cruisingAltitude,
                actions: wp.actions || { type: WAYPOINT_ACTION_TYPE.FLY_THROUGH },
            }));
            return extractIntermediateWaypoints(list, departureHub, arrivalHub);
        }
        const parsed = parseInitialRouteWaypoints(
            initialRoute,
            departureHub,
            arrivalHub,
            cruisingAltitude
        );
        return extractIntermediateWaypoints(parsed, departureHub, arrivalHub);
    }, [initialWaypoints, initialRoute, departureHub, arrivalHub, cruisingAltitude]);

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
        initialWaypoints: parsedInitial,
        isReadOnly,
        onClearErrors,
    });

    const initializedRouteRef = useRef(false);

    useEffect(() => {
        if (initializedRouteRef.current) return;
        if (parsedInitial.length > 0) {
            initializedRouteRef.current = true;
            setWaypoints(parsedInitial);
        }
    }, [parsedInitial, setWaypoints]);

    const addWaypoint = useCallback(
        (lat: number, lng: number, altitude?: number) => {
            if (isReadOnly) return;
            const seq = (departureHub ? 2 : 1) + waypoints.length;
            const idStr = `wp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            const newWp: FlightWaypoint = {
                id: idStr,
                tempId: idStr,
                sequence: seq,
                name: `Waypoint ${seq}`,
                latitude: lat,
                longitude: lng,
                altitude: altitude ?? cruisingAltitude,
                actions: { type: WAYPOINT_ACTION_TYPE.FLY_THROUGH },
            };
            setWaypoints((prev) => [...prev, newWp]);
            setSelectedWaypointId(idStr);
            onClearErrors?.();
        },
        [
            isReadOnly,
            departureHub,
            waypoints.length,
            cruisingAltitude,
            onClearErrors,
            setWaypoints,
            setSelectedWaypointId,
        ]
    );

    const updateWaypoint = useCallback(
        (wpOrId: string | FlightWaypoint, updates?: Partial<FlightWaypoint>) => {
            if (isReadOnly) return;
            if (typeof wpOrId === "object") {
                const updated = wpOrId;
                setWaypoints((prev) =>
                    prev.map((w) => {
                        const match =
                            (w.id && w.id === updated.id) ||
                            (w.tempId && w.tempId === updated.tempId);
                        return match ? updated : w;
                    })
                );
            } else {
                const id = wpOrId;
                setWaypoints((prev) =>
                    prev.map((wp) => (matchesId(wp, id) ? { ...wp, ...updates } : wp))
                );
            }
            onClearErrors?.();
        },
        [isReadOnly, matchesId, onClearErrors, setWaypoints]
    );

    const moveWaypoint = useCallback(
        (id: string, lat: number, lng: number) => {
            if (isReadOnly) return;
            setWaypoints((prev) =>
                prev.map((wp) =>
                    matchesId(wp, id) ? { ...wp, latitude: lat, longitude: lng } : wp
                )
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
        deleteWaypoint: removeWaypoint,
        moveWaypointOrder,
        undoWaypoint,
        clearWaypoints,
        totalDistanceM,
        computedGeoJsonLineString,
    };
}

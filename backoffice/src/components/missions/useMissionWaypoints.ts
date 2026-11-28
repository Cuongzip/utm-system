"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
    STOPOVER_DEFAULT_GROUND_TIME,
    STOPOVER_TYPE,
    WAYPOINT_ACTION_TYPE,
    WAYPOINT_TYPE,
    type Hub,
    type StopoverType,
    type Waypoint,
} from "@/types";
import { useWaypointManager } from "@/hooks/useWaypointManager";
import { extractIntermediateWaypoints } from "@/components/waypoints";

interface UseMissionWaypointsOptions {
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
    const t = useTranslations("missions");
    const tWp = useTranslations("waypoints");
    const sanitizedInitial = useMemo(() => {
        return extractIntermediateWaypoints(initialWaypoints, departureHub, arrivalHub);
    }, [initialWaypoints, departureHub, arrivalHub]);

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
        initialWaypoints: sanitizedInitial,
        isReadOnly,
        onClearErrors: onClearWaypointErrors,
    });

    const [defaultAltitude, setDefaultAltitude] = useState(initialAltitude);

    const handleSelectWaypoint = useCallback(
        (wp: Waypoint | null) => {
            setSelectedWaypointId(wp ? String(wp.id || wp.tempId) : null);
        },
        [setSelectedWaypointId]
    );

    const handleAddWaypoint = useCallback(
        (lat: number, lng: number, altitude: number) => {
            if (isReadOnly) return;
            const seqNum = (departureHub ? 2 : 1) + waypoints.length;
            const newWp: Waypoint = {
                tempId: `wp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                sequence: seqNum,
                name: tWp("defaultWaypointName", { seq: seqNum }),
                waypointType: WAYPOINT_TYPE.COORDINATE,
                latitude: lat,
                longitude: lng,
                altitude: altitude ?? defaultAltitude,
                actions: { type: WAYPOINT_ACTION_TYPE.FLY_THROUGH },
            };
            setWaypoints((prev) => [...prev, newWp]);
            onClearWaypointErrors?.();
        },
        [
            isReadOnly,
            departureHub,
            waypoints.length,
            defaultAltitude,
            onClearWaypointErrors,
            setWaypoints,
            tWp,
        ]
    );

    const handleAddHubWaypoint = useCallback(
        (hub: Hub, stopoverType: StopoverType = STOPOVER_TYPE.RECHARGE) => {
            if (isReadOnly) return;
            if (hub.location?.latitude === undefined || hub.location?.longitude === undefined) {
                toast.error(t("toasts.hubMissingCoords"));
                return;
            }
            const resolvedStopover =
                stopoverType === STOPOVER_TYPE.NONE ? STOPOVER_TYPE.RECHARGE : stopoverType;
            const seqNum = (departureHub ? 2 : 1) + waypoints.length;
            const newWp: Waypoint = {
                tempId: `wp-hub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                sequence: seqNum,
                name: hub.name || hub.code || tWp("defaultHubStopoverName", { seq: seqNum }),
                waypointType: WAYPOINT_TYPE.HUB,
                hubId: hub.id,
                latitude: hub.location.latitude,
                longitude: hub.location.longitude,
                altitude: 0,
                stopoverType: resolvedStopover,
                groundTimeMinutes: STOPOVER_DEFAULT_GROUND_TIME[resolvedStopover],
            };
            setWaypoints((prev) => [...prev, newWp]);
            onClearWaypointErrors?.();
            toast.success(t("toasts.addedHubStopover", { hub: hub.code || hub.name || "" }));
        },
        [isReadOnly, departureHub, waypoints.length, onClearWaypointErrors, setWaypoints, t, tWp]
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
                        if (wp.hubId || wp.waypointType === WAYPOINT_TYPE.HUB) {
                            return wp;
                        }
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
            toast.error(t("toasts.selectBothHubsFirst"));
            return;
        }

        setWaypoints([]);
        onClearWaypointErrors?.();
        toast.success(
            t("toasts.generatedDirectRoute", {
                from: departureHub.code || departureHub.name || "",
                to: arrivalHub.code || arrivalHub.name || "",
            })
        );
    }, [isReadOnly, departureHub, arrivalHub, onClearWaypointErrors, setWaypoints, t]);

    return {
        waypoints,
        setWaypoints,
        selectedWaypointId,
        setSelectedWaypointId,
        selectedWaypoint,
        defaultAltitude,
        setDefaultAltitude,
        handleAddWaypoint,
        handleAddHubWaypoint,
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

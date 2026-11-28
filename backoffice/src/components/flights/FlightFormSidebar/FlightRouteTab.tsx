"use client";

import { useTranslations } from "next-intl";
import type { FlightWaypoint, Hub } from "@/types";
import { WaypointRouteTab } from "@/components/waypoints";

interface FlightRouteTabProps {
    waypoints: FlightWaypoint[];
    selectedWaypoint: FlightWaypoint | null;
    onSelectWaypoint: (wp: FlightWaypoint | null) => void;
    onUpdateWaypoint: (wp: FlightWaypoint) => void;
    onDeleteWaypoint: (id: string) => void;
    onMoveWaypointOrder: (fromIndex: number, toIndex: number) => void;
    departureHub: Hub | null;
    arrivalHub: Hub | null;
    isReadOnly: boolean;
    fieldErrors: Record<string, string>;
    onClearFieldError: (field: string) => void;
}

export function FlightRouteTab({
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
}: FlightRouteTabProps) {
    const t = useTranslations("flights.waypointsTab");
    const routeError =
        fieldErrors.plannedRoute ||
        fieldErrors["plannedRoute.coordinates"] ||
        fieldErrors.route ||
        fieldErrors.waypoints;

    return (
        <WaypointRouteTab
            title={t("routeCheckpoints")}
            waypoints={waypoints}
            selectedWaypoint={selectedWaypoint}
            onSelectWaypoint={onSelectWaypoint}
            onUpdateWaypoint={onUpdateWaypoint}
            onDeleteWaypoint={onDeleteWaypoint}
            onMoveWaypointOrder={onMoveWaypointOrder}
            departureHub={departureHub}
            arrivalHub={arrivalHub}
            defaultAltitude={120}
            isReadOnly={isReadOnly}
            generalError={routeError}
            fieldErrors={fieldErrors}
            onClearFieldError={onClearFieldError}
        />
    );
}

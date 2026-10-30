"use client";

import { useMemo } from "react";
import { ChamferCard, type SelectOption } from "@/components/ui";
import { cn } from "@/lib";
import type { Drone, Hub } from "@/types";
import type { FlightWaypoint } from "../useFlightRoute";
import { FlightDetailsTab } from "./sidebar/FlightDetailsTab";
import { FlightRouteTab } from "./sidebar/FlightRouteTab";
import { FlightScheduleTab } from "./sidebar/FlightScheduleTab";

export interface FlightFormSidebarProps {
    mode: "create" | "edit";
    flightNumber: string;
    onFlightNumberChange: (val: string) => void;
    droneId: string;
    onDroneIdChange: (val: string) => void;
    departureHubId: string;
    onDepartureHubIdChange: (val: string) => void;
    arrivalHubId: string;
    onArrivalHubIdChange: (val: string) => void;
    pilotId: string;
    onPilotIdChange: (val: string) => void;
    cruisingAltitudeM: number;
    onCruisingAltitudeMChange: (val: number) => void;
    notes: string;
    onNotesChange: (val: string) => void;
    executionId?: string;
    onExecutionIdChange?: (val: string) => void;
    scheduledDeparture: string;
    onScheduledDepartureChange: (val: string) => void;
    scheduledArrival: string;
    onScheduledArrivalChange: (val: string) => void;

    drones?: Drone[];
    hubs?: Hub[];
    waypoints?: FlightWaypoint[];
    selectedWaypoint?: FlightWaypoint | null;
    onSelectWaypoint?: (wp: FlightWaypoint | null) => void;
    onUpdateWaypoint?: (id: string, updates: Partial<FlightWaypoint>) => void;
    onRemoveWaypoint?: (id: string) => void;
    onMoveWaypointOrder?: (fromIndex: number, toIndex: number) => void;
    totalDistanceM?: number;

    activeTab: "details" | "waypoints" | "schedule";
    onTabChange: (tab: "details" | "waypoints" | "schedule") => void;
    fieldErrors?: Record<string, string>;
    onClearFieldError?: (field: string) => void;
    isReadOnly?: boolean;
    className?: string;
}

export function FlightFormSidebar({
    mode,
    flightNumber,
    onFlightNumberChange,
    droneId,
    onDroneIdChange,
    departureHubId,
    onDepartureHubIdChange,
    arrivalHubId,
    onArrivalHubIdChange,
    pilotId,
    onPilotIdChange,
    cruisingAltitudeM,
    onCruisingAltitudeMChange,
    notes,
    onNotesChange,
    executionId = "",
    onExecutionIdChange,
    scheduledDeparture,
    onScheduledDepartureChange,
    scheduledArrival,
    onScheduledArrivalChange,

    drones = [],
    hubs = [],
    waypoints = [],
    selectedWaypoint = null,
    onSelectWaypoint = () => {},
    onUpdateWaypoint,
    onRemoveWaypoint,
    onMoveWaypointOrder,
    totalDistanceM = 0,

    activeTab,
    onTabChange,
    fieldErrors = {},
    onClearFieldError,
    isReadOnly = false,
    className = "",
}: FlightFormSidebarProps) {
    const droneOptions: SelectOption[] = useMemo(() => {
        return [
            { value: "", label: "Select assigned drone..." },
            ...drones.map((d) => ({
                value: d.id,
                label: `${d.registrationNumber || d.model || d.id} (${(d.status || "available").toUpperCase()})`,
            })),
        ];
    }, [drones]);

    const hubOptions: SelectOption[] = useMemo(() => {
        return [
            { value: "", label: "Select vertiport / hub..." },
            ...hubs.map((h) => ({
                value: h.id,
                label: `${h.name} (${h.code || "HUB"})`,
            })),
        ];
    }, [hubs]);

    const durationMinutes = useMemo(() => {
        if (!scheduledDeparture || !scheduledArrival) return null;
        const dep = new Date(scheduledDeparture).getTime();
        const arr = new Date(scheduledArrival).getTime();
        if (isNaN(dep) || isNaN(arr) || arr <= dep) return null;
        return Math.round((arr - dep) / (1000 * 60));
    }, [scheduledDeparture, scheduledArrival]);

    const hasDetailsErrors = Boolean(
        fieldErrors.flightNumber ||
        fieldErrors.droneId ||
        fieldErrors.departureHubId ||
        fieldErrors.arrivalHubId ||
        fieldErrors.pilotId ||
        fieldErrors.cruisingAltitudeM ||
        fieldErrors.executionId ||
        fieldErrors.notes
    );

    const hasRouteErrors = Boolean(
        fieldErrors.plannedRoute || fieldErrors["plannedRoute.coordinates"] || fieldErrors.route
    );

    const hasScheduleErrors = Boolean(
        fieldErrors.scheduledDeparture || fieldErrors.scheduledArrival
    );

    return (
        <ChamferCard size="lg" className={cn("w-full h-full", className)}>
            <div className="flex flex-col h-full bg-[var(--color-surface-panel)] select-none overflow-hidden">
                <div className="grid grid-cols-3 border-b border-[var(--color-border-default)] bg-[var(--color-surface-panel)] text-xs">
                    <button
                        type="button"
                        onClick={() => onTabChange("details")}
                        className={cn(
                            "py-3 text-center border-b-2 transition-colors cursor-pointer text-xs font-bold tracking-wide flex items-center justify-center gap-1.5",
                            activeTab === "details"
                                ? "border-[var(--color-border-dark)] text-[var(--color-text-primary)] bg-[var(--color-surface-card)]/50"
                                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                            hasDetailsErrors && "text-red-600"
                        )}
                    >
                        <span>Details</span>
                        {hasDetailsErrors && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => onTabChange("waypoints")}
                        className={cn(
                            "py-3 text-center border-b-2 transition-colors cursor-pointer text-xs font-bold tracking-wide flex items-center justify-center gap-1.5",
                            activeTab === "waypoints"
                                ? "border-[var(--color-border-dark)] text-[var(--color-text-primary)] bg-[var(--color-surface-card)]/50"
                                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                            hasRouteErrors && "text-red-600"
                        )}
                    >
                        <span>Waypoints {waypoints.length > 0 && `(${waypoints.length})`}</span>
                        {hasRouteErrors && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                    </button>

                    <button
                        type="button"
                        onClick={() => onTabChange("schedule")}
                        className={cn(
                            "py-3 text-center border-b-2 transition-colors cursor-pointer text-xs font-bold tracking-wide flex items-center justify-center gap-1.5",
                            activeTab === "schedule"
                                ? "border-[var(--color-border-dark)] text-[var(--color-text-primary)] bg-[var(--color-surface-card)]/50"
                                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                            hasScheduleErrors && "text-red-600"
                        )}
                    >
                        <span>Schedule</span>
                        {hasScheduleErrors && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        )}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 select-text">
                    {activeTab === "details" && (
                        <FlightDetailsTab
                            mode={mode}
                            flightNumber={flightNumber}
                            onFlightNumberChange={onFlightNumberChange}
                            droneId={droneId}
                            onDroneIdChange={onDroneIdChange}
                            departureHubId={departureHubId}
                            onDepartureHubIdChange={onDepartureHubIdChange}
                            arrivalHubId={arrivalHubId}
                            onArrivalHubIdChange={onArrivalHubIdChange}
                            pilotId={pilotId}
                            onPilotIdChange={onPilotIdChange}
                            cruisingAltitudeM={cruisingAltitudeM}
                            onCruisingAltitudeMChange={onCruisingAltitudeMChange}
                            notes={notes}
                            onNotesChange={onNotesChange}
                            executionId={executionId}
                            onExecutionIdChange={onExecutionIdChange}
                            droneOptions={droneOptions}
                            hubOptions={hubOptions}
                            totalDistanceM={totalDistanceM}
                            waypointsCount={waypoints.length}
                            isReadOnly={isReadOnly}
                            fieldErrors={fieldErrors}
                            onClearFieldError={onClearFieldError}
                        />
                    )}

                    {activeTab === "waypoints" && (
                        <FlightRouteTab
                            waypoints={waypoints}
                            selectedWaypoint={selectedWaypoint}
                            onSelectWaypoint={onSelectWaypoint}
                            onUpdateWaypoint={onUpdateWaypoint}
                            onRemoveWaypoint={onRemoveWaypoint}
                            onMoveWaypointOrder={onMoveWaypointOrder}
                            isReadOnly={isReadOnly}
                            fieldErrors={fieldErrors}
                            onClearFieldError={onClearFieldError}
                        />
                    )}

                    {activeTab === "schedule" && (
                        <FlightScheduleTab
                            scheduledDeparture={scheduledDeparture}
                            onScheduledDepartureChange={onScheduledDepartureChange}
                            scheduledArrival={scheduledArrival}
                            onScheduledArrivalChange={onScheduledArrivalChange}
                            durationMinutes={durationMinutes}
                            isReadOnly={isReadOnly}
                            fieldErrors={fieldErrors}
                            onClearFieldError={onClearFieldError}
                        />
                    )}
                </div>
            </div>
        </ChamferCard>
    );
}

export default FlightFormSidebar;

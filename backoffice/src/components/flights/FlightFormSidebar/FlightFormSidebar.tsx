"use client";

import { useMemo } from "react";
import { ChamferCard, type SelectOption } from "@/components/ui";
import { cn } from "@/lib";
import {
    DEFAULT_DRONE_STATUS,
    type Drone,
    type Hub,
    type FeasibilityVerdict,
    type FlightFormPayload,
} from "@/types";
import type { FlightWaypoint } from "../useFlightRoute";
import { FlightDetailsTab } from "./FlightDetailsTab";
import { FlightRouteTab } from "./FlightRouteTab";
import { FlightScheduleTab } from "./FlightScheduleTab";

export interface FlightFormSidebarProps {
    flightId?: string;
    formData: FlightFormPayload;
    onFormChange: <K extends keyof FlightFormPayload>(
        field: K,
        value: FlightFormPayload[K]
    ) => void;
    mode: "create" | "edit";
    drones: Drone[];
    hubs: Hub[];
    departureHub: Hub | null;
    arrivalHub: Hub | null;
    waypoints: FlightWaypoint[];
    selectedWaypoint: FlightWaypoint | null;
    onSelectWaypoint: (wp: FlightWaypoint | null) => void;
    onUpdateWaypoint: (wp: FlightWaypoint) => void;
    onDeleteWaypoint: (id: string) => void;
    onMoveWaypointOrder: (fromIndex: number, toIndex: number) => void;
    totalDistanceM: number;
    feasibilityVerdict: FeasibilityVerdict;
    isFeasibilityWarning: boolean;
    activeTab: "details" | "waypoints" | "schedule";
    onTabChange: (tab: "details" | "waypoints" | "schedule") => void;
    fieldErrors: Record<string, string>;
    onClearFieldError: (field: string) => void;
    isReadOnly: boolean;
}

export function FlightFormSidebar({
    flightId,
    formData,
    onFormChange,
    mode,
    drones = [],
    hubs = [],
    departureHub,
    arrivalHub,
    waypoints = [],
    selectedWaypoint = null,
    onSelectWaypoint,
    onUpdateWaypoint,
    onDeleteWaypoint,
    onMoveWaypointOrder,
    totalDistanceM = 0,
    feasibilityVerdict,
    isFeasibilityWarning = false,
    activeTab,
    onTabChange,
    fieldErrors = {},
    onClearFieldError,
    isReadOnly = false,
}: FlightFormSidebarProps) {
    const droneOptions: SelectOption[] = useMemo(() => {
        return [
            { value: "", label: "Select assigned drone..." },
            ...drones.map((d) => ({
                value: d.id,
                label: `${d.registrationNumber || d.model || d.id} (${(d.status ?? DEFAULT_DRONE_STATUS).toUpperCase()})`,
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
        if (!formData.scheduledDeparture || !formData.scheduledArrival) return null;
        const dep = new Date(formData.scheduledDeparture).getTime();
        const arr = new Date(formData.scheduledArrival).getTime();
        if (isNaN(dep) || isNaN(arr) || arr <= dep) return null;
        return Math.round((arr - dep) / (1000 * 60));
    }, [formData.scheduledDeparture, formData.scheduledArrival]);

    const hasDetailsErrors = Boolean(
        fieldErrors.flightNumber ||
        fieldErrors.droneId ||
        fieldErrors.departureHubId ||
        fieldErrors.arrivalHubId ||
        fieldErrors.pilotId ||
        fieldErrors.cruisingAltitudeM ||
        fieldErrors.executionId ||
        fieldErrors.notes ||
        fieldErrors.feasibilityOverride
    );

    const hasRouteErrors = Boolean(
        fieldErrors.plannedRoute || fieldErrors["plannedRoute.coordinates"] || fieldErrors.route
    );

    const hasScheduleErrors = Boolean(
        fieldErrors.scheduledDeparture || fieldErrors.scheduledArrival
    );

    const totalPoints = waypoints.length + (departureHub ? 1 : 0) + (arrivalHub ? 1 : 0);

    return (
        <ChamferCard size="lg" className="w-full h-full min-h-0">
            <div className="flex flex-col h-full min-h-0 bg-[var(--color-surface-panel)] select-none overflow-hidden">
                <div className="grid grid-cols-3 border-b border-[var(--color-border-default)] bg-[var(--color-surface-panel)] text-xs shrink-0">
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
                        <span>Waypoints {totalPoints > 0 && `(${totalPoints})`}</span>
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

                <div className="flex-1 min-h-0 overflow-y-auto p-4 select-text">
                    {activeTab === "details" && (
                        <FlightDetailsTab
                            flightId={flightId}
                            formData={formData}
                            onFormChange={onFormChange}
                            mode={mode}
                            drones={drones}
                            droneOptions={droneOptions}
                            hubOptions={hubOptions}
                            totalDistanceM={totalDistanceM}
                            feasibilityVerdict={feasibilityVerdict}
                            isFeasibilityWarning={isFeasibilityWarning}
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
                            onDeleteWaypoint={onDeleteWaypoint}
                            onMoveWaypointOrder={onMoveWaypointOrder}
                            departureHub={departureHub}
                            arrivalHub={arrivalHub}
                            isReadOnly={isReadOnly}
                            fieldErrors={fieldErrors}
                            onClearFieldError={onClearFieldError}
                        />
                    )}

                    {activeTab === "schedule" && (
                        <FlightScheduleTab
                            scheduledDeparture={formData.scheduledDeparture || ""}
                            onScheduledDepartureChange={(val) =>
                                onFormChange("scheduledDeparture", val)
                            }
                            scheduledArrival={formData.scheduledArrival || ""}
                            onScheduledArrivalChange={(val) =>
                                onFormChange("scheduledArrival", val)
                            }
                            durationMinutes={durationMinutes}
                            isReadOnly={isReadOnly}
                            fieldErrors={fieldErrors}
                        />
                    )}
                </div>
            </div>
        </ChamferCard>
    );
}

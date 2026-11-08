"use client";

import { useMemo } from "react";
import { ChamferCard, type SelectOption } from "@/components/ui";
import { cn } from "@/lib";
import type { Drone, Hub, FeasibilityVerdict, FlightFormPayload } from "@/types";
import type { FlightWaypoint } from "../useFlightRoute";
import { FlightDetailsTab } from "./FlightDetailsTab";
import { FlightRouteTab } from "./FlightRouteTab";
import { FlightScheduleTab } from "./FlightScheduleTab";

export interface FlightFormSidebarProps {
    formData: FlightFormPayload;
    onFormChange: <K extends keyof FlightFormPayload>(
        field: K,
        value: FlightFormPayload[K]
    ) => void;
    mode: "create" | "edit";
    drones?: Drone[];
    hubs?: Hub[];
    waypoints?: FlightWaypoint[];
    selectedWaypoint: FlightWaypoint | null;
    onSelectWaypoint: (wp: FlightWaypoint | null) => void;
    onUpdateWaypoint: (id: string, updates: Partial<FlightWaypoint>) => void;
    onRemoveWaypoint: (id: string) => void;
    onMoveWaypointOrder: (fromIndex: number, toIndex: number) => void;
    totalDistanceM?: number;
    feasibilityVerdict?: FeasibilityVerdict;
    isFeasibilityWarning?: boolean;
    activeTab: "details" | "waypoints" | "schedule";
    onTabChange: (tab: "details" | "waypoints" | "schedule") => void;
    fieldErrors?: Record<string, string>;
    onClearFieldError?: (field: string) => void;
    isReadOnly?: boolean;
    className?: string;
}

export function FlightFormSidebar({
    formData,
    onFormChange,
    mode,
    drones = [],
    hubs = [],
    waypoints = [],
    selectedWaypoint = null,
    onSelectWaypoint,
    onUpdateWaypoint,
    onRemoveWaypoint,
    onMoveWaypointOrder,
    totalDistanceM = 0,
    feasibilityVerdict,
    isFeasibilityWarning = false,
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

    return (
        <ChamferCard size="lg" className={cn("w-full h-full min-h-0", className)}>
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

                <div className="flex-1 min-h-0 overflow-y-auto p-4 select-text">
                    {activeTab === "details" && (
                        <FlightDetailsTab
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
                            onRemoveWaypoint={onRemoveWaypoint}
                            onMoveWaypointOrder={onMoveWaypointOrder}
                            isReadOnly={isReadOnly}
                            fieldErrors={fieldErrors}
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

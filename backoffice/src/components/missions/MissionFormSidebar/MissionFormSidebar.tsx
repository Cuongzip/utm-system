"use client";

import React from "react";
import { ChamferCard, type SelectOption } from "@/components/ui";
import { cn } from "@/lib";
import type { Waypoint, Drone, Hub, MissionScheduleType } from "@/types";
import { MissionDetailsTab } from "./sidebar/MissionDetailsTab";
import { MissionWaypointsTab } from "./sidebar/MissionWaypointsTab";
import { MissionScheduleTab } from "./sidebar/MissionScheduleTab";

export interface MissionFormSidebarProps {
    name: string;
    onNameChange: (val: string) => void;
    description: string;
    onDescriptionChange: (val: string) => void;
    droneId: string;
    onDroneIdChange: (val: string) => void;
    departureHubId: string;
    onDepartureHubIdChange: (val: string) => void;
    arrivalHubId: string;
    onArrivalHubIdChange: (val: string) => void;
    scheduleType: MissionScheduleType;
    onScheduleTypeChange: (val: MissionScheduleType) => void;
    scheduledAt: string;
    onScheduledAtChange: (val: string) => void;
    drones: Drone[];
    hubs: Hub[];
    waypoints: Waypoint[];
    selectedWaypoint: Waypoint | null;
    onSelectWaypoint: (wp: Waypoint | null) => void;
    onUpdateWaypoint: (wp: Waypoint) => void;
    onDeleteWaypoint: (wpId: string) => void;
    onMoveWaypointOrder?: (fromIndex: number, toIndex: number) => void;
    activeTab: "details" | "waypoints" | "schedule";
    onTabChange: (tab: "details" | "waypoints" | "schedule") => void;
    totalDistanceM: number;
    isReadOnly?: boolean;
    className?: string;
    fieldErrors?: Record<string, string>;
    onClearFieldError?: (field: string) => void;
}

export function MissionFormSidebar({
    name,
    onNameChange,
    description,
    onDescriptionChange,
    droneId,
    onDroneIdChange,
    departureHubId,
    onDepartureHubIdChange,
    arrivalHubId,
    onArrivalHubIdChange,
    scheduleType,
    onScheduleTypeChange,
    scheduledAt,
    onScheduledAtChange,
    drones = [],
    hubs = [],
    waypoints = [],
    selectedWaypoint,
    onSelectWaypoint,
    onUpdateWaypoint,
    onDeleteWaypoint,
    onMoveWaypointOrder,
    activeTab,
    onTabChange,
    totalDistanceM,
    isReadOnly = false,
    className = "",
    fieldErrors = {},
    onClearFieldError,
}: MissionFormSidebarProps) {
    const hasWaypointErrors = Boolean(
        fieldErrors.waypoints || Object.keys(fieldErrors).some((k) => k.startsWith("waypoints."))
    );

    const droneOptions: SelectOption[] = [
        { value: "", label: "No drone assigned" },
        ...drones.map((d) => ({
            value: d.id,
            label: `${d.model || d.registrationNumber || d.id} (${d.status || "available"})`,
        })),
    ];

    const hubOptions: SelectOption[] = hubs.map((h) => ({
        value: h.id,
        label: `${h.name}${h.code ? ` (${h.code})` : ""}`,
    }));

    const arrivalHubOptions: SelectOption[] = [
        { value: "", label: "Same as departure" },
        ...hubOptions,
    ];

    return (
        <ChamferCard size="lg" accent="dark" className={cn("w-full h-full", className)}>
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
                            (fieldErrors.name ||
                                fieldErrors.departureHubId ||
                                fieldErrors.arrivalHubId) &&
                                "text-red-600"
                        )}
                    >
                        <span>Details</span>
                        {(fieldErrors.name ||
                            fieldErrors.departureHubId ||
                            fieldErrors.arrivalHubId) && (
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
                            hasWaypointErrors && "text-red-600"
                        )}
                    >
                        <span>Waypoints {waypoints.length > 0 && `(${waypoints.length})`}</span>
                        {hasWaypointErrors && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => onTabChange("schedule")}
                        className={cn(
                            "py-3 text-center border-b-2 transition-colors cursor-pointer text-xs font-bold tracking-wide flex items-center justify-center gap-1.5",
                            activeTab === "schedule"
                                ? "border-[var(--color-border-dark)] text-[var(--color-text-primary)] bg-[var(--color-surface-card)]/50"
                                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                            fieldErrors.scheduledAt && "text-red-600"
                        )}
                    >
                        <span>Schedule</span>
                        {fieldErrors.scheduledAt && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        )}
                    </button>
                </div>

                <div className="flex-1 p-5 overflow-y-auto space-y-4">
                    {activeTab === "details" && (
                        <MissionDetailsTab
                            name={name}
                            onNameChange={onNameChange}
                            description={description}
                            onDescriptionChange={onDescriptionChange}
                            droneId={droneId}
                            onDroneIdChange={onDroneIdChange}
                            departureHubId={departureHubId}
                            onDepartureHubIdChange={onDepartureHubIdChange}
                            arrivalHubId={arrivalHubId}
                            onArrivalHubIdChange={onArrivalHubIdChange}
                            droneOptions={droneOptions}
                            hubOptions={hubOptions}
                            arrivalHubOptions={arrivalHubOptions}
                            totalDistanceM={totalDistanceM}
                            waypointsCount={waypoints.length}
                            isReadOnly={isReadOnly}
                            fieldErrors={fieldErrors}
                            onClearFieldError={onClearFieldError}
                        />
                    )}

                    {activeTab === "waypoints" && (
                        <MissionWaypointsTab
                            waypoints={waypoints}
                            selectedWaypoint={selectedWaypoint}
                            onSelectWaypoint={onSelectWaypoint}
                            onUpdateWaypoint={onUpdateWaypoint}
                            onDeleteWaypoint={onDeleteWaypoint}
                            onMoveWaypointOrder={onMoveWaypointOrder}
                            isReadOnly={isReadOnly}
                            fieldErrors={fieldErrors}
                            onClearFieldError={onClearFieldError}
                        />
                    )}

                    {activeTab === "schedule" && (
                        <MissionScheduleTab
                            scheduleType={scheduleType}
                            onScheduleTypeChange={onScheduleTypeChange}
                            scheduledAt={scheduledAt}
                            onScheduledAtChange={onScheduledAtChange}
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

export default MissionFormSidebar;

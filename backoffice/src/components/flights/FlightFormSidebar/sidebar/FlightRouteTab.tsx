"use client";

import { X, MapPin, ChevronUp, ChevronDown, Trash2, AlertCircle } from "lucide-react";
import { FormInput } from "@/components/ui";
import { cn } from "@/utils";
import type { Drone } from "@/types";
import type { FlightWaypoint } from "../../useFlightRoute";

export interface FlightRouteTabProps {
    waypoints: FlightWaypoint[];
    selectedWaypoint: FlightWaypoint | null;
    onSelectWaypoint: (wp: FlightWaypoint | null) => void;
    onUpdateWaypoint?: (id: string, updates: Partial<FlightWaypoint>) => void;
    onRemoveWaypoint?: (id: string) => void;
    onMoveWaypointOrder?: (fromIndex: number, toIndex: number) => void;
    mode?: "create" | "edit";
    distanceM?: number;
    drone?: Drone | null;
    isReadOnly?: boolean;
    fieldErrors?: Record<string, string>;
    onClearFieldError?: (field: string) => void;
}

export function FlightRouteTab({
    waypoints = [],
    selectedWaypoint,
    onSelectWaypoint,
    onUpdateWaypoint,
    onRemoveWaypoint,
    onMoveWaypointOrder,
    mode = "create",
    distanceM = 0,
    drone = null,
    isReadOnly = false,
    fieldErrors = {},
    onClearFieldError,
}: FlightRouteTabProps) {
    const routeError =
        fieldErrors.plannedRoute || fieldErrors["plannedRoute.coordinates"] || fieldErrors.route;

    return (
        <div className="space-y-4">
            {routeError && (
                <div className="p-2.5 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{routeError}</span>
                </div>
            )}

            {selectedWaypoint ? (
                <div className="space-y-3.5">
                    <div className="flex items-center justify-between border-b border-[var(--color-border-default)] pb-2.5">
                        <span className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wide">
                            Edit Waypoint #{selectedWaypoint.sequence}
                        </span>
                        <button
                            type="button"
                            onClick={() => onSelectWaypoint(null)}
                            className="px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded hover:bg-[var(--color-surface-card)] cursor-pointer flex items-center gap-1"
                        >
                            <X className="w-3.5 h-3.5" />
                            <span>Close</span>
                        </button>
                    </div>

                    <div className="space-y-3">
                        <FormInput
                            id="wpName"
                            label="Waypoint Name / Label"
                            value={selectedWaypoint.name || ""}
                            disabled={isReadOnly}
                            onChange={(e) => {
                                onUpdateWaypoint?.(selectedWaypoint.id, { name: e.target.value });
                                onClearFieldError?.("plannedRoute");
                            }}
                            placeholder={`Waypoint ${selectedWaypoint.sequence}`}
                        />

                        <div className="grid grid-cols-2 gap-2">
                            <FormInput
                                id="wpLat"
                                label="Latitude (°N)"
                                type="number"
                                step="any"
                                value={selectedWaypoint.lat}
                                disabled={isReadOnly}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val)) {
                                        onUpdateWaypoint?.(selectedWaypoint.id, { lat: val });
                                        onClearFieldError?.("plannedRoute");
                                    }
                                }}
                            />
                            <FormInput
                                id="wpLng"
                                label="Longitude (°E)"
                                type="number"
                                step="any"
                                value={selectedWaypoint.lng}
                                disabled={isReadOnly}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val)) {
                                        onUpdateWaypoint?.(selectedWaypoint.id, { lng: val });
                                        onClearFieldError?.("plannedRoute");
                                    }
                                }}
                            />
                        </div>

                        <FormInput
                            id="wpAlt"
                            label="Altitude (meters MSL)"
                            type="number"
                            min={10}
                            max={1000}
                            value={selectedWaypoint.altitude}
                            disabled={isReadOnly}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val)) {
                                    onUpdateWaypoint?.(selectedWaypoint.id, { altitude: val });
                                    onClearFieldError?.("plannedRoute");
                                }
                            }}
                        />
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-between pb-1 border-b border-[var(--color-border-default)]">
                        <span className="text-xs font-bold text-[var(--color-text-primary)]">
                            Flight Route Checkpoints
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)] font-mono">
                            {waypoints.length} points
                        </span>
                    </div>

                    {waypoints.length === 0 ? (
                        <div className="p-6 border border-dashed border-[var(--color-border-default)] rounded-md text-center space-y-2">
                            <MapPin className="w-6 h-6 text-slate-400 mx-auto" />
                            <div className="text-xs font-semibold text-[var(--color-text-primary)]">
                                No waypoints placed
                            </div>
                            <div className="text-[11px] text-[var(--color-text-muted)] max-w-xs mx-auto">
                                Click on the map canvas to place waypoints along the planned route.
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {waypoints.map((wp, idx) => {
                                const wpHasError = Object.keys(fieldErrors).some((k) =>
                                    k.startsWith(`waypoints.${idx}.`)
                                );

                                return (
                                    <div
                                        key={wp.id || wp.tempId || idx}
                                        onClick={() => onSelectWaypoint(wp)}
                                        className={cn(
                                            "p-3 rounded-md border transition-all cursor-pointer flex items-center justify-between",
                                            wpHasError
                                                ? "border-red-300 bg-red-50/40 hover:border-red-400 dark:border-red-800 dark:bg-red-950/20"
                                                : "border-[var(--color-border-default)] bg-[var(--color-surface-panel)] hover:border-[var(--color-border-strong)] hover:shadow-2xs"
                                        )}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <span
                                                className={cn(
                                                    "w-5 h-5 rounded-full font-mono text-[10px] flex items-center justify-center font-bold text-white",
                                                    wpHasError
                                                        ? "bg-red-500"
                                                        : "bg-[var(--color-border-dark)]"
                                                )}
                                            >
                                                {wp.sequence ?? idx + 1}
                                            </span>
                                            <div className="text-xs font-mono">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-[var(--color-text-primary)]">
                                                        {wp.name ||
                                                            `Waypoint ${wp.sequence ?? idx + 1}`}
                                                    </span>
                                                    {wpHasError && (
                                                        <span className="text-[10px] text-red-500 font-sans font-medium flex items-center gap-0.5">
                                                            <AlertCircle className="w-3 h-3 text-red-500" />
                                                            Invalid
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[var(--color-text-muted)] text-[11px]">
                                                    Alt: {wp.altitude || 50}m
                                                </span>
                                            </div>
                                        </div>

                                        {!isReadOnly && (
                                            <div
                                                className="flex items-center gap-1"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <button
                                                    type="button"
                                                    disabled={idx === 0}
                                                    onClick={() =>
                                                        onMoveWaypointOrder?.(idx, idx - 1)
                                                    }
                                                    className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-card)] disabled:opacity-20 disabled:pointer-events-none cursor-pointer transition-colors"
                                                    title="Move point up"
                                                >
                                                    <ChevronUp className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={idx === waypoints.length - 1}
                                                    onClick={() =>
                                                        onMoveWaypointOrder?.(idx, idx + 1)
                                                    }
                                                    className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-card)] disabled:opacity-20 disabled:pointer-events-none cursor-pointer transition-colors"
                                                    title="Move point down"
                                                >
                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                </button>
                                                {onRemoveWaypoint && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onRemoveWaypoint(wp.id)}
                                                        className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-tech-red)] hover:bg-red-50 cursor-pointer transition-colors"
                                                        title="Delete waypoint"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default FlightRouteTab;

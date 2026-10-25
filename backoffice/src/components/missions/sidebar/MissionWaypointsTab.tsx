"use client";

import React, { useState } from "react";
import { AlertCircle, X, MapPin, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { FormInput } from "@/components/ui";
import { cn } from "@/lib";
import type { Waypoint } from "@/types";

export interface MissionWaypointsTabProps {
    waypoints: Waypoint[];
    selectedWaypoint: Waypoint | null;
    onSelectWaypoint: (wp: Waypoint | null) => void;
    onUpdateWaypoint: (wp: Waypoint) => void;
    onDeleteWaypoint: (wpId: string) => void;
    onMoveWaypointOrder?: (fromIndex: number, toIndex: number) => void;
    isReadOnly?: boolean;
    fieldErrors?: Record<string, string>;
    onClearFieldError?: (field: string) => void;
}

export function MissionWaypointsTab({
    waypoints = [],
    selectedWaypoint,
    onSelectWaypoint,
    onUpdateWaypoint,
    onDeleteWaypoint,
    onMoveWaypointOrder,
    isReadOnly = false,
    fieldErrors = {},
    onClearFieldError,
}: MissionWaypointsTabProps) {
    const [waypointSubTab, setWaypointSubTab] = useState<"position" | "actions" | "conditions">(
        "position"
    );

    const selectedIdx = selectedWaypoint
        ? waypoints.findIndex(
              (w) =>
                  (w.id && w.id === selectedWaypoint.id) ||
                  (w.tempId && w.tempId === selectedWaypoint.tempId)
          )
        : -1;

    const nameError = selectedIdx >= 0 ? fieldErrors[`waypoints.${selectedIdx}.name`] : undefined;
    const latError =
        selectedIdx >= 0 ? fieldErrors[`waypoints.${selectedIdx}.latitude`] : undefined;
    const lngError =
        selectedIdx >= 0 ? fieldErrors[`waypoints.${selectedIdx}.longitude`] : undefined;
    const altError =
        selectedIdx >= 0 ? fieldErrors[`waypoints.${selectedIdx}.altitude`] : undefined;

    const hasPositionErrors = Boolean(nameError || latError || lngError || altError);

    return (
        <div className="space-y-4">
            {fieldErrors.waypoints && (
                <div className="p-2.5 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{fieldErrors.waypoints}</span>
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

                    <div className="grid grid-cols-3 bg-[var(--color-surface-card)] p-1 rounded-md text-[11px] font-semibold text-center border border-[var(--color-border-default)]">
                        <button
                            type="button"
                            onClick={() => setWaypointSubTab("position")}
                            className={cn(
                                "py-1 rounded transition-colors cursor-pointer flex items-center justify-center gap-1",
                                waypointSubTab === "position"
                                    ? "bg-[var(--color-surface-panel)] shadow-2xs text-[var(--color-text-primary)] font-bold"
                                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                                hasPositionErrors && "text-red-600"
                            )}
                        >
                            <span>Position</span>
                            {hasPositionErrors && (
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setWaypointSubTab("actions")}
                            className={cn(
                                "py-1 rounded transition-colors cursor-pointer",
                                waypointSubTab === "actions"
                                    ? "bg-[var(--color-surface-panel)] shadow-2xs text-[var(--color-text-primary)] font-bold"
                                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                            )}
                        >
                            Actions
                        </button>
                        <button
                            type="button"
                            onClick={() => setWaypointSubTab("conditions")}
                            className={cn(
                                "py-1 rounded transition-colors cursor-pointer",
                                waypointSubTab === "conditions"
                                    ? "bg-[var(--color-surface-panel)] shadow-2xs text-[var(--color-text-primary)] font-bold"
                                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                            )}
                        >
                            Conditions
                        </button>
                    </div>

                    {waypointSubTab === "position" && (
                        <div className="space-y-3 pt-1">
                            <FormInput
                                id="wpName"
                                label="Name"
                                placeholder="Optional waypoint name"
                                value={selectedWaypoint.name || ""}
                                disabled={isReadOnly}
                                onChange={(e) => {
                                    onUpdateWaypoint({ ...selectedWaypoint, name: e.target.value });
                                    if (selectedIdx >= 0)
                                        onClearFieldError?.(`waypoints.${selectedIdx}.name`);
                                }}
                                error={nameError}
                            />

                            <div className="form-row-2">
                                <FormInput
                                    id="wpLat"
                                    label="Latitude"
                                    required
                                    type="number"
                                    step="0.000001"
                                    value={
                                        selectedWaypoint.latitude === undefined ||
                                        Number.isNaN(selectedWaypoint.latitude)
                                            ? ""
                                            : selectedWaypoint.latitude
                                    }
                                    disabled={isReadOnly}
                                    onChange={(e) => {
                                        const val =
                                            e.target.value === ""
                                                ? 0
                                                : Number.parseFloat(e.target.value);
                                        onUpdateWaypoint({ ...selectedWaypoint, latitude: val });
                                        if (selectedIdx >= 0)
                                            onClearFieldError?.(
                                                `waypoints.${selectedIdx}.latitude`
                                            );
                                    }}
                                    error={latError}
                                />
                                <FormInput
                                    id="wpLng"
                                    label="Longitude"
                                    required
                                    type="number"
                                    step="0.000001"
                                    value={
                                        selectedWaypoint.longitude === undefined ||
                                        Number.isNaN(selectedWaypoint.longitude)
                                            ? ""
                                            : selectedWaypoint.longitude
                                    }
                                    disabled={isReadOnly}
                                    onChange={(e) => {
                                        const val =
                                            e.target.value === ""
                                                ? 0
                                                : Number.parseFloat(e.target.value);
                                        onUpdateWaypoint({ ...selectedWaypoint, longitude: val });
                                        if (selectedIdx >= 0)
                                            onClearFieldError?.(
                                                `waypoints.${selectedIdx}.longitude`
                                            );
                                    }}
                                    error={lngError}
                                />
                            </div>

                            <FormInput
                                id="wpAlt"
                                label="Altitude (m)"
                                type="number"
                                min="0"
                                max="500"
                                value={
                                    selectedWaypoint.altitude === undefined ||
                                    Number.isNaN(selectedWaypoint.altitude)
                                        ? 50
                                        : selectedWaypoint.altitude
                                }
                                disabled={isReadOnly}
                                onChange={(e) => {
                                    const val =
                                        e.target.value === ""
                                            ? 0
                                            : Number.parseFloat(e.target.value);
                                    onUpdateWaypoint({ ...selectedWaypoint, altitude: val });
                                    if (selectedIdx >= 0)
                                        onClearFieldError?.(`waypoints.${selectedIdx}.altitude`);
                                }}
                                error={altError}
                            />

                            <div className="form-row-2">
                                <div className="form-group">
                                    <label className="form-label">Speed (m/s)</label>
                                    <input
                                        type="number"
                                        placeholder="Default"
                                        value={selectedWaypoint.conditions?.speed || ""}
                                        disabled={isReadOnly}
                                        onChange={(e) =>
                                            onUpdateWaypoint({
                                                ...selectedWaypoint,
                                                conditions: {
                                                    ...selectedWaypoint.conditions,
                                                    speed:
                                                        Number.parseFloat(e.target.value) ||
                                                        undefined,
                                                },
                                            })
                                        }
                                        className="form-input font-mono"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Turn Radius (m)</label>
                                    <input
                                        type="number"
                                        placeholder="Default"
                                        value={selectedWaypoint.conditions?.turnRadius || ""}
                                        disabled={isReadOnly}
                                        onChange={(e) =>
                                            onUpdateWaypoint({
                                                ...selectedWaypoint,
                                                conditions: {
                                                    ...selectedWaypoint.conditions,
                                                    turnRadius:
                                                        Number.parseFloat(e.target.value) ||
                                                        undefined,
                                                },
                                            })
                                        }
                                        className="form-input font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {waypointSubTab === "actions" && (
                        <div className="space-y-3 pt-1">
                            <div className="form-group">
                                <label className="form-label">Hover Duration (s)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="3600"
                                    placeholder="0"
                                    value={selectedWaypoint.actions?.hoverDurationS || ""}
                                    disabled={isReadOnly}
                                    onChange={(e) =>
                                        onUpdateWaypoint({
                                            ...selectedWaypoint,
                                            actions: {
                                                ...selectedWaypoint.actions,
                                                hoverDurationS:
                                                    Number.parseFloat(e.target.value) || undefined,
                                            },
                                        })
                                    }
                                    className="form-input font-mono"
                                />
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="waitConfirmation"
                                    checked={Boolean(selectedWaypoint.actions?.waitForConfirmation)}
                                    disabled={isReadOnly}
                                    onChange={(e) =>
                                        onUpdateWaypoint({
                                            ...selectedWaypoint,
                                            actions: {
                                                ...selectedWaypoint.actions,
                                                waitForConfirmation: e.target.checked,
                                            },
                                        })
                                    }
                                    className="rounded border-[var(--color-border-default)] cursor-pointer"
                                />
                                <label
                                    htmlFor="waitConfirmation"
                                    className="text-xs text-[var(--color-text-primary)] cursor-pointer font-medium"
                                >
                                    Wait for ATC confirmation before proceed
                                </label>
                            </div>
                        </div>
                    )}

                    {waypointSubTab === "conditions" && (
                        <div className="space-y-3 pt-1">
                            <div className="form-group">
                                <label className="form-label">Max Wind Tolerance (m/s)</label>
                                <input
                                    type="number"
                                    placeholder="e.g. 15"
                                    value={selectedWaypoint.conditions?.maxWindSpeed || ""}
                                    disabled={isReadOnly}
                                    onChange={(e) =>
                                        onUpdateWaypoint({
                                            ...selectedWaypoint,
                                            conditions: {
                                                ...selectedWaypoint.conditions,
                                                maxWindSpeed:
                                                    Number.parseFloat(e.target.value) || undefined,
                                            },
                                        })
                                    }
                                    className="form-input font-mono"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Min Visibility (m)</label>
                                <input
                                    type="number"
                                    placeholder="e.g. 5000"
                                    value={selectedWaypoint.conditions?.minVisibility || ""}
                                    disabled={isReadOnly}
                                    onChange={(e) =>
                                        onUpdateWaypoint({
                                            ...selectedWaypoint,
                                            conditions: {
                                                ...selectedWaypoint.conditions,
                                                minVisibility:
                                                    Number.parseFloat(e.target.value) || undefined,
                                            },
                                        })
                                    }
                                    className="form-input font-mono"
                                />
                            </div>
                        </div>
                    )}
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
                                const wpHasError =
                                    fieldErrors[`waypoints.${idx}.name`] ||
                                    fieldErrors[`waypoints.${idx}.latitude`] ||
                                    fieldErrors[`waypoints.${idx}.longitude`];

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
                                                {wp.sequence}
                                            </span>
                                            <div className="text-xs font-mono">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-[var(--color-text-primary)]">
                                                        {wp.name || `Point ${wp.sequence}`}
                                                    </span>
                                                    {wpHasError && (
                                                        <span className="text-[10px] text-red-500 font-sans font-medium flex items-center gap-0.5">
                                                            <AlertCircle className="w-3 h-3 text-red-500" />
                                                            Invalid
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[var(--color-text-muted)] ml-2 text-[11px]">
                                                    Alt: {wp.altitude || 50}m
                                                </span>
                                            </div>
                                        </div>

                                        {!isReadOnly && (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    disabled={idx === 0}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onMoveWaypointOrder?.(idx, idx - 1);
                                                    }}
                                                    className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-card)] disabled:opacity-20 disabled:pointer-events-none cursor-pointer transition-colors"
                                                    title="Move point up"
                                                >
                                                    <ChevronUp className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={idx === waypoints.length - 1}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onMoveWaypointOrder?.(idx, idx + 1);
                                                    }}
                                                    className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-card)] disabled:opacity-20 disabled:pointer-events-none cursor-pointer transition-colors"
                                                    title="Move point down"
                                                >
                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteWaypoint(
                                                            String(wp.id || wp.tempId)
                                                        );
                                                    }}
                                                    className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-tech-red)] hover:bg-red-50 cursor-pointer transition-colors"
                                                    title="Delete point"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
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

export default MissionWaypointsTab;

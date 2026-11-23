"use client";

import { AlertCircle, PlaneTakeoff, PlaneLanding } from "lucide-react";
import type { Hub } from "@/types";
import type { WaypointItem } from "./types";
import { WaypointEditor } from "./WaypointEditor/WaypointEditor";
import { PinnedHubWaypointItem } from "./WaypointList/PinnedHubWaypointItem";
import { WaypointListItem } from "./WaypointList/WaypointListItem";

export interface WaypointRouteTabProps<T extends WaypointItem> {
    title?: string;
    waypoints: T[];
    selectedWaypoint: T | null;
    onSelectWaypoint: (wp: T | null) => void;
    onUpdateWaypoint: (wp: T) => void;
    onDeleteWaypoint: (wpId: string) => void;
    onMoveWaypointOrder: (fromIndex: number, toIndex: number) => void;
    departureHub?: Hub | null;
    arrivalHub?: Hub | null;
    defaultAltitude?: number;
    isReadOnly?: boolean;
    generalError?: string;
    fieldErrors?: Record<string, string>;
    onClearFieldError?: (field: string) => void;
}

export function WaypointRouteTab<T extends WaypointItem>({
    title = "Flight Route Checkpoints",
    waypoints = [],
    selectedWaypoint,
    onSelectWaypoint,
    onUpdateWaypoint,
    onDeleteWaypoint,
    onMoveWaypointOrder,
    departureHub,
    arrivalHub,
    defaultAltitude = 50,
    isReadOnly = false,
    generalError,
    fieldErrors = {},
    onClearFieldError,
}: WaypointRouteTabProps<T>) {
    const selectedIdx = selectedWaypoint
        ? waypoints.findIndex(
              (w) =>
                  (w.id && w.id === selectedWaypoint.id) ||
                  (w.tempId && w.tempId === selectedWaypoint.tempId)
          )
        : -1;

    const totalPoints = waypoints.length + (departureHub ? 1 : 0) + (arrivalHub ? 1 : 0);

    return (
        <div className="space-y-4">
            {generalError && (
                <div className="p-2.5 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{generalError}</span>
                </div>
            )}

            {selectedWaypoint ? (
                <WaypointEditor
                    waypoint={selectedWaypoint}
                    onUpdate={onUpdateWaypoint}
                    onClose={() => onSelectWaypoint(null)}
                    defaultAltitude={defaultAltitude}
                    isReadOnly={isReadOnly}
                    fieldErrors={fieldErrors}
                    waypointIndex={
                        selectedIdx >= 0 ? (departureHub ? 1 : 0) + selectedIdx : undefined
                    }
                    onClearFieldError={onClearFieldError}
                />
            ) : (
                <>
                    <div className="flex items-center justify-between pb-1 border-b border-[var(--color-border-default)]">
                        <span className="text-xs font-bold text-[var(--color-text-primary)]">
                            {title}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)] font-mono">
                            {totalPoints} points
                        </span>
                    </div>

                    <div className="space-y-2">
                        {departureHub ? (
                            <PinnedHubWaypointItem
                                type="departure"
                                hub={departureHub}
                                sequence={1}
                            />
                        ) : (
                            <div className="p-3 rounded-md border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface-panel)] flex items-center justify-between opacity-80">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-200 font-mono text-[10px] flex items-center justify-center font-bold">
                                        1
                                    </span>
                                    <div className="text-xs font-mono">
                                        <span className="font-semibold text-[var(--color-text-primary)]">
                                            Departure Station (Select in Details tab)
                                        </span>
                                        <span className="text-[var(--color-text-muted)] text-[11px] block mt-0.5">
                                            Alt: 0m
                                        </span>
                                    </div>
                                </div>
                                <div className="pr-1 text-[var(--color-text-muted)]" title="Origin">
                                    <PlaneTakeoff className="w-4 h-4" />
                                </div>
                            </div>
                        )}

                        {waypoints.map((wp, idx) => {
                            const fullIndex = (departureHub ? 1 : 0) + idx;
                            const wpHasError = Object.keys(fieldErrors).some(
                                (k) =>
                                    k.startsWith(`waypoints.${fullIndex}.`) ||
                                    k.startsWith(`waypoints.${idx}.`)
                            );
                            const seqDisplay = (departureHub ? 2 : 1) + idx;

                            return (
                                <WaypointListItem
                                    key={wp.id || wp.tempId || idx}
                                    waypoint={wp}
                                    displaySequence={seqDisplay}
                                    hasError={wpHasError}
                                    isFirst={idx === 0}
                                    isLast={idx === waypoints.length - 1}
                                    isReadOnly={isReadOnly}
                                    onSelect={() => onSelectWaypoint(wp)}
                                    onMoveUp={() => onMoveWaypointOrder(idx, idx - 1)}
                                    onMoveDown={() => onMoveWaypointOrder(idx, idx + 1)}
                                    onDelete={() => onDeleteWaypoint(String(wp.id || wp.tempId))}
                                />
                            );
                        })}

                        {arrivalHub ? (
                            <PinnedHubWaypointItem
                                type="arrival"
                                hub={arrivalHub}
                                sequence={(departureHub ? 2 : 1) + waypoints.length}
                            />
                        ) : (
                            <div className="p-3 rounded-md border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface-panel)] flex items-center justify-between opacity-80">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-200 font-mono text-[10px] flex items-center justify-center font-bold">
                                        {(departureHub ? 2 : 1) + waypoints.length}
                                    </span>
                                    <div className="text-xs font-mono">
                                        <span className="font-semibold text-[var(--color-text-primary)]">
                                            Arrival Station (Select in Details tab)
                                        </span>
                                        <span className="text-[var(--color-text-muted)] text-[11px] block mt-0.5">
                                            Alt: 0m
                                        </span>
                                    </div>
                                </div>
                                <div
                                    className="pr-1 text-[var(--color-text-muted)]"
                                    title="Destination"
                                >
                                    <PlaneLanding className="w-4 h-4" />
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

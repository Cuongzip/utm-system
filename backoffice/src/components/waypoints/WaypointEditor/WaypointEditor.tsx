"use client";

import { useState } from "react";
import { cn } from "@/lib";
import type { WaypointItem } from "../types";
import { WaypointEditorHeader } from "./WaypointEditorHeader";
import { WaypointPositionSubTab } from "./WaypointPositionSubTab";
import { WaypointActionsSubTab } from "./WaypointActionsSubTab";
import { WaypointConditionsSubTab } from "./WaypointConditionsSubTab";

export interface WaypointEditorProps<T extends WaypointItem> {
    waypoint: T;
    onUpdate: (wp: T) => void;
    onClose: () => void;
    defaultAltitude: number;
    isReadOnly: boolean;
    fieldErrors: Record<string, string>;
    waypointIndex: number;
    onClearFieldError: (field: string) => void;
}

export function WaypointEditor<T extends WaypointItem>({
    waypoint,
    onUpdate,
    onClose,
    defaultAltitude,
    isReadOnly,
    fieldErrors,
    waypointIndex,
    onClearFieldError,
}: WaypointEditorProps<T>) {
    const [activeSubTab, setActiveSubTab] = useState<"position" | "actions" | "conditions">(
        "position"
    );

    const prefix = waypointIndex >= 0 ? `waypoints.${waypointIndex}.` : "";
    const nameError = prefix ? fieldErrors[`${prefix}name`] : undefined;
    const latError = prefix ? fieldErrors[`${prefix}latitude`] : undefined;
    const lngError = prefix ? fieldErrors[`${prefix}longitude`] : undefined;
    const altError = prefix ? fieldErrors[`${prefix}altitude`] : undefined;
    const actionsError = prefix ? fieldErrors[`${prefix}actions`] : undefined;
    const conditionsError = prefix ? fieldErrors[`${prefix}conditions`] : undefined;

    const hasPositionErrors = Boolean(nameError || latError || lngError || altError);
    const hasActionsErrors = Boolean(actionsError);
    const hasConditionsErrors = Boolean(conditionsError);

    return (
        <div className="space-y-3.5">
            <WaypointEditorHeader waypoint={waypoint} onClose={onClose} />

            <div className="grid grid-cols-3 bg-[var(--color-surface-card)] p-1 rounded-md text-[11px] font-semibold text-center border border-[var(--color-border-default)]">
                <button
                    type="button"
                    onClick={() => setActiveSubTab("position")}
                    className={cn(
                        "py-1 rounded transition-colors cursor-pointer flex items-center justify-center gap-1",
                        activeSubTab === "position"
                            ? "bg-[var(--color-surface-panel)] shadow-2xs text-[var(--color-text-primary)] font-bold"
                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                        hasPositionErrors && "text-red-600"
                    )}
                >
                    <span>Position</span>
                    {hasPositionErrors && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                </button>
                <button
                    type="button"
                    onClick={() => setActiveSubTab("actions")}
                    className={cn(
                        "py-1 rounded transition-colors cursor-pointer flex items-center justify-center gap-1",
                        activeSubTab === "actions"
                            ? "bg-[var(--color-surface-panel)] shadow-2xs text-[var(--color-text-primary)] font-bold"
                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                        hasActionsErrors && "text-red-600"
                    )}
                >
                    <span>Actions</span>
                    {hasActionsErrors && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                </button>
                <button
                    type="button"
                    onClick={() => setActiveSubTab("conditions")}
                    className={cn(
                        "py-1 rounded transition-colors cursor-pointer flex items-center justify-center gap-1",
                        activeSubTab === "conditions"
                            ? "bg-[var(--color-surface-panel)] shadow-2xs text-[var(--color-text-primary)] font-bold"
                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                        hasConditionsErrors && "text-red-600"
                    )}
                >
                    <span>Conditions</span>
                    {hasConditionsErrors && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    )}
                </button>
            </div>

            {activeSubTab === "position" && (
                <WaypointPositionSubTab
                    key={waypoint.id || waypoint.tempId}
                    waypoint={waypoint}
                    onUpdate={onUpdate}
                    defaultAltitude={defaultAltitude}
                    isReadOnly={isReadOnly}
                    nameError={nameError}
                    latError={latError}
                    lngError={lngError}
                    altError={altError}
                    onClearNameError={
                        prefix ? () => onClearFieldError?.(`${prefix}name`) : undefined
                    }
                    onClearLatError={
                        prefix ? () => onClearFieldError?.(`${prefix}latitude`) : undefined
                    }
                    onClearLngError={
                        prefix ? () => onClearFieldError?.(`${prefix}longitude`) : undefined
                    }
                    onClearAltError={
                        prefix ? () => onClearFieldError?.(`${prefix}altitude`) : undefined
                    }
                />
            )}

            {activeSubTab === "actions" && (
                <WaypointActionsSubTab
                    waypoint={waypoint}
                    onUpdate={onUpdate}
                    isReadOnly={isReadOnly}
                    error={actionsError}
                />
            )}

            {activeSubTab === "conditions" && (
                <WaypointConditionsSubTab
                    waypoint={waypoint}
                    onUpdate={onUpdate}
                    isReadOnly={isReadOnly}
                    error={conditionsError}
                />
            )}
        </div>
    );
}

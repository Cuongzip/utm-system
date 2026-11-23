"use client";

import { AlertCircle, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib";
import { formatAltitude, formatCoordinates } from "@/utils";
import type { WaypointItem } from "../types";

export interface WaypointListItemProps<T extends WaypointItem> {
    waypoint: T;
    displaySequence: number;
    hasError?: boolean;
    isFirst: boolean;
    isLast: boolean;
    isReadOnly?: boolean;
    onSelect: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onDelete: () => void;
}

export function WaypointListItem<T extends WaypointItem>({
    waypoint,
    displaySequence,
    hasError = false,
    isFirst,
    isLast,
    isReadOnly = false,
    onSelect,
    onMoveUp,
    onMoveDown,
    onDelete,
}: WaypointListItemProps<T>) {
    return (
        <div
            onClick={onSelect}
            className={cn(
                "p-3 rounded-md border transition-all cursor-pointer flex items-center justify-between",
                hasError
                    ? "border-red-300 bg-red-50/40 hover:border-red-400 dark:border-red-800 dark:bg-red-950/20"
                    : "border-[var(--color-border-default)] bg-[var(--color-surface-panel)] hover:border-[var(--color-border-strong)] hover:shadow-2xs"
            )}
        >
            <div className="flex items-center gap-2.5">
                <span
                    className={cn(
                        "w-5 h-5 rounded-full font-mono text-[10px] flex items-center justify-center font-bold",
                        hasError ? "bg-red-500 text-white" : "bg-slate-700 text-slate-200"
                    )}
                >
                    {displaySequence}
                </span>
                <div className="text-xs font-mono">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--color-text-primary)]">
                            {waypoint.name || `Waypoint ${displaySequence}`}
                        </span>
                        {hasError && (
                            <span className="text-[10px] text-red-500 font-sans font-medium flex items-center gap-0.5">
                                <AlertCircle className="w-3 h-3 text-red-500" />
                                Invalid
                            </span>
                        )}
                    </div>
                    <span className="text-[var(--color-text-muted)] text-[11px] block mt-0.5">
                        Alt: {formatAltitude(waypoint.altitude ?? 50)} •{" "}
                        {formatCoordinates(waypoint)}
                    </span>
                </div>
            </div>

            {!isReadOnly && (
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        disabled={isFirst}
                        onClick={(e) => {
                            e.stopPropagation();
                            onMoveUp();
                        }}
                        className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-card)] disabled:opacity-20 disabled:pointer-events-none cursor-pointer transition-colors"
                        title="Move point up"
                    >
                        <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        disabled={isLast}
                        onClick={(e) => {
                            e.stopPropagation();
                            onMoveDown();
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
                            onDelete();
                        }}
                        className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-tech-red)] hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer transition-colors"
                        title="Delete point"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
}

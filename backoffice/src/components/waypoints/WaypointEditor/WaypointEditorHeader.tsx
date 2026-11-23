"use client";

import { X } from "lucide-react";
import type { WaypointItem } from "../types";

export interface WaypointEditorHeaderProps {
    waypoint: WaypointItem;
    onClose: () => void;
}

export function WaypointEditorHeader({ waypoint, onClose }: WaypointEditorHeaderProps) {
    return (
        <div className="flex items-center justify-between border-b border-[var(--color-border-default)] pb-2.5">
            <span className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wide">
                Edit Waypoint #{waypoint.sequence}
            </span>
            <button
                type="button"
                onClick={onClose}
                className="px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded hover:bg-[var(--color-surface-card)] cursor-pointer flex items-center gap-1"
            >
                <X className="w-3.5 h-3.5" />
                <span>Close</span>
            </button>
        </div>
    );
}

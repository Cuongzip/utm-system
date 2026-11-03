"use client";

import { Undo2, Trash2 } from "lucide-react";

export interface MapUndoClearProps {
    onUndo?: () => void;
    onClear?: () => void;
    disabled?: boolean;
}

export function MapUndoClear({ onUndo, onClear, disabled = false }: MapUndoClearProps) {
    return (
        <div className="flex items-center h-[34px] gap-1 bg-[var(--color-surface-card)] p-1 rounded border border-[var(--color-border-default)]">
            <button
                type="button"
                onClick={onUndo}
                disabled={disabled || !onUndo}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Undo last point"
            >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Undo</span>
            </button>
            <button
                type="button"
                onClick={onClear}
                disabled={disabled || !onClear}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Clear all points"
            >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
            </button>
        </div>
    );
}

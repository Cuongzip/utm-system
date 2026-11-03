"use client";

import { Layers } from "lucide-react";
import { cn } from "@/lib";

export interface MapZoneActionProps {
    active: boolean;
    onToggle: () => void;
    count?: number;
    className?: string;
}

export function MapZoneAction({ active, onToggle, count, className }: MapZoneActionProps) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={cn(
                "inline-flex items-center gap-1.5 px-2.5 h-[34px] text-xs font-semibold rounded border transition-colors cursor-pointer",
                active
                    ? "bg-[var(--color-surface-card)] border-[var(--color-border-default)] text-[var(--color-border-dark)] font-bold"
                    : "border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-card)]",
                className
            )}
            title="Toggle background airspace sectors"
        >
            <Layers className="w-3.5 h-3.5" />
            <span>Zones{typeof count === "number" ? ` (${count})` : ""}</span>
        </button>
    );
}

"use client";

import { PlaneTakeoff, PlaneLanding } from "lucide-react";
import type { Hub } from "@/types";
import { formatAltitude, formatCoordinates } from "@/utils";

export interface PinnedHubWaypointItemProps {
    type: "departure" | "arrival";
    hub: Hub;
    sequence: number;
}

export function PinnedHubWaypointItem({ type, hub, sequence }: PinnedHubWaypointItemProps) {
    const isDeparture = type === "departure";
    const lat = hub.location?.latitude;
    const lng = hub.location?.longitude;
    const coordStr =
        lat !== undefined && lng !== undefined ? formatCoordinates(hub.location) : null;

    return (
        <div className="p-3 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-panel)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-200 font-mono text-[10px] flex items-center justify-center font-bold">
                    {sequence}
                </span>
                <div className="text-xs font-mono">
                    <span className="font-semibold text-[var(--color-text-primary)]">
                        Hub:{" "}
                        {hub.name ||
                            hub.code ||
                            (isDeparture ? "Departure Vertiport" : "Arrival Vertiport")}
                    </span>
                    <span className="text-[var(--color-text-muted)] text-[11px] block mt-0.5">
                        Alt: {formatAltitude(hub.altitudeMsl ?? 0)}
                        {coordStr ? ` • ${coordStr}` : ""}
                    </span>
                </div>
            </div>
            <div
                className="flex items-center pr-1 text-[var(--color-text-muted)]"
                title={isDeparture ? "Origin" : "Destination"}
            >
                {isDeparture ? (
                    <PlaneTakeoff className="w-4 h-4" />
                ) : (
                    <PlaneLanding className="w-4 h-4" />
                )}
            </div>
        </div>
    );
}

"use client";

import { useTranslations } from "next-intl";
import { PlaneTakeoff, PlaneLanding } from "lucide-react";
import type { Hub } from "@/types";
import { formatAltitude, formatCoordinates } from "@/utils";

interface PinnedHubWaypointItemProps {
    type: "departure" | "arrival";
    hub: Hub;
    sequence: number;
}

export function PinnedHubWaypointItem({ type, hub, sequence }: PinnedHubWaypointItemProps) {
    const t = useTranslations("waypoints");
    const isDeparture = type === "departure";
    const lat = hub.location?.latitude;
    const lng = hub.location?.longitude;
    const coordStr =
        lat !== undefined && lng !== undefined ? formatCoordinates(hub.location) : null;
    const elevStr =
        hub.altitudeMsl !== undefined && hub.altitudeMsl !== null
            ? t("elev", { alt: formatAltitude(hub.altitudeMsl) })
            : null;
    const padMeta = [hub.code, elevStr, coordStr].filter(Boolean).join(" • ");

    return (
        <div className="p-3 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-subtle)] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white font-mono text-[10px] flex items-center justify-center font-bold shrink-0">
                    {sequence}
                </span>
                <div className="text-xs font-mono min-w-0">
                    <span className="font-semibold text-[var(--color-text-primary)] block truncate">
                        {hub.name ||
                            hub.code ||
                            (isDeparture ? t("departureVertiport") : t("arrivalVertiport"))}
                    </span>
                    <span className="text-[var(--color-text-muted)] text-[11px] block mt-0.5 truncate">
                        {padMeta}
                    </span>
                </div>
            </div>
            <div
                className="flex items-center pr-1 text-[var(--color-text-muted)] shrink-0"
                title={isDeparture ? t("originVertiport") : t("destinationVertiport")}
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

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, PlaneTakeoff, PlaneLanding } from "lucide-react";
import { WAYPOINT_TYPE, type Hub } from "@/types";
import type { WaypointItem } from "./types";
import { WaypointEditor } from "./WaypointEditor/WaypointEditor";
import { PinnedHubWaypointItem } from "./WaypointList/PinnedHubWaypointItem";
import { WaypointListItem } from "./WaypointList/WaypointListItem";

export interface WaypointRouteTabProps<T extends WaypointItem> {
    title: string;
    waypoints: T[];
    selectedWaypoint: T | null;
    onSelectWaypoint: (wp: T | null) => void;
    onUpdateWaypoint: (wp: T) => void;
    onDeleteWaypoint: (wpId: string) => void;
    onMoveWaypointOrder: (fromIndex: number, toIndex: number) => void;
    departureHub: Hub | null;
    arrivalHub: Hub | null;
    hubs?: Hub[];
    defaultAltitude: number;
    isReadOnly: boolean;
    generalError: string | undefined;
    fieldErrors: Record<string, string>;
    onClearFieldError: (field: string) => void;
}

export function WaypointRouteTab<T extends WaypointItem>({
    title,
    waypoints,
    selectedWaypoint,
    onSelectWaypoint,
    onUpdateWaypoint,
    onDeleteWaypoint,
    onMoveWaypointOrder,
    departureHub,
    arrivalHub,
    hubs,
    defaultAltitude,
    isReadOnly,
    generalError,
    fieldErrors,
    onClearFieldError,
}: WaypointRouteTabProps<T>) {
    const t = useTranslations("waypoints");
    const selectedIdx = selectedWaypoint
        ? waypoints.findIndex(
              (w) =>
                  (w.id && w.id === selectedWaypoint.id) ||
                  (w.tempId && w.tempId === selectedWaypoint.tempId)
          )
        : -1;

    const hubMap = useMemo(() => {
        const map = new Map<string, Hub>();
        for (const h of hubs ?? []) {
            if (h.id) map.set(h.id, h);
        }
        return map;
    }, [hubs]);

    const hubStopCount = useMemo(
        () =>
            waypoints.filter((w) => w.waypointType === WAYPOINT_TYPE.HUB || Boolean(w.hubId))
                .length,
        [waypoints]
    );
    const totalPoints = waypoints.length + (departureHub ? 1 : 0) + (arrivalHub ? 1 : 0);
    const routeSummaryLabel =
        hubStopCount > 0
            ? t("legsCount", { count: hubStopCount + 1 })
            : t("pointsCount", { count: totalPoints });

    return (
        <div className="space-y-3">
            {generalError && (
                <div className="p-2.5 rounded-md bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{generalError}</span>
                </div>
            )}

            {selectedWaypoint ? (
                <WaypointEditor
                    waypoint={selectedWaypoint}
                    onUpdate={onUpdateWaypoint}
                    onClose={() => onSelectWaypoint(null)}
                    hubs={hubs}
                    defaultAltitude={defaultAltitude}
                    isReadOnly={isReadOnly}
                    fieldErrors={fieldErrors}
                    waypointIndex={selectedIdx}
                    altWaypointIndex={
                        selectedIdx >= 0 && departureHub ? selectedIdx + 1 : undefined
                    }
                    onClearFieldError={onClearFieldError}
                />
            ) : (
                <>
                    <div className="flex items-center justify-between pb-1.5 border-b border-[var(--color-border-default)]">
                        <span className="text-xs font-bold font-mono uppercase tracking-wider text-[var(--color-text-primary)]">
                            {title}
                        </span>
                        <span className="text-[11px] text-[var(--color-text-muted)] font-mono">
                            {routeSummaryLabel}
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
                                            {t("selectDepartureInDetails")}
                                        </span>
                                        <span className="text-[var(--color-text-muted)] text-[11px] block mt-0.5">
                                            {t("originVertiport")}
                                        </span>
                                    </div>
                                </div>
                                <div
                                    className="pr-1 text-[var(--color-text-muted)]"
                                    title={t("origin")}
                                >
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
                            const matchedHub = wp.hubId ? (hubMap.get(wp.hubId) ?? null) : null;

                            return (
                                <WaypointListItem
                                    key={wp.id || wp.tempId || idx}
                                    waypoint={wp}
                                    matchedHub={matchedHub}
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
                                            {t("selectArrivalInDetails")}
                                        </span>
                                        <span className="text-[var(--color-text-muted)] text-[11px] block mt-0.5">
                                            {t("destinationVertiport")}
                                        </span>
                                    </div>
                                </div>
                                <div
                                    className="pr-1 text-[var(--color-text-muted)]"
                                    title={t("destination")}
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

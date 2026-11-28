"use client";

import { useTranslations } from "next-intl";
import { AlertCircle, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib";
import { formatAltitude, formatCoordinates } from "@/utils";
import { type Hub } from "@/types";
import {
    isHubWaypointItem,
    parseHubActionItems,
    parseWaypointActionItems,
    type WaypointItem,
} from "../types";

interface WaypointListItemProps<T extends WaypointItem> {
    waypoint: T;
    matchedHub?: Hub | null;
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
    matchedHub = null,
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
    const t = useTranslations("waypoints");
    const isHubStop = isHubWaypointItem(waypoint);
    const displayName =
        (isHubStop ? matchedHub?.name || waypoint.name : waypoint.name) ||
        t("defaultWaypointName", { seq: displaySequence });
    const coordStr = formatCoordinates(waypoint);
    const hubItems = isHubStop ? parseHubActionItems(waypoint) : [];
    const hubStopSummary =
        hubItems.length > 0
            ? `${hubItems.map((i) => t(`stopoverShort.${i.type}`)).join(" + ")}${
                  waypoint.groundTimeMinutes != null && waypoint.groundTimeMinutes > 0
                      ? ` ${waypoint.groundTimeMinutes}m`
                      : ""
              }`
            : null;
    const actionCount = isHubStop ? 0 : parseWaypointActionItems(waypoint).length;
    const actionSummary =
        actionCount > 0 ? t("actions.actionsCountBadge", { count: actionCount }) : null;
    const metaText = isHubStop
        ? [matchedHub?.code, hubStopSummary, coordStr].filter(Boolean).join(" • ")
        : [
              t("altMeta", {
                  alt: formatAltitude(waypoint.altitude ?? 50),
                  coords: coordStr,
              }),
              actionSummary,
          ]
              .filter(Boolean)
              .join(" • ");

    return (
        <div
            className={cn(
                "p-3 rounded-md border transition-all flex items-center justify-between gap-2",
                hasError
                    ? "border-red-300 bg-red-50/40 hover:border-red-400"
                    : "border-[var(--color-border-default)] bg-[var(--color-surface-subtle)] hover:border-[var(--color-border-strong)]"
            )}
        >
            <button
                type="button"
                onClick={onSelect}
                className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded"
            >
                <span
                    className={cn(
                        "w-5 h-5 rounded-full font-mono text-[10px] flex items-center justify-center font-bold shrink-0",
                        hasError
                            ? "bg-red-500 text-white"
                            : isHubStop
                              ? "bg-slate-800 text-white"
                              : "bg-slate-600 text-white"
                    )}
                >
                    {displaySequence}
                </span>
                <div className="text-xs font-mono min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-semibold text-[var(--color-text-primary)] truncate">
                            {displayName}
                        </span>
                        {isHubStop && (
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700 uppercase shrink-0">
                                HUB
                            </span>
                        )}
                        {hasError && (
                            <span className="text-[10px] text-red-500 font-sans font-medium flex items-center gap-0.5 shrink-0">
                                <AlertCircle className="w-3 h-3 text-red-500" />
                                {t("invalid")}
                            </span>
                        )}
                    </div>
                    <span className="text-[var(--color-text-muted)] text-[11px] block mt-0.5 truncate">
                        {metaText}
                    </span>
                </div>
            </button>

            {!isReadOnly && (
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        disabled={isFirst}
                        onClick={onMoveUp}
                        className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-card)] disabled:opacity-20 disabled:pointer-events-none cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        title={t("moveUp")}
                        aria-label={t("moveUp")}
                    >
                        <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        disabled={isLast}
                        onClick={onMoveDown}
                        className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-card)] disabled:opacity-20 disabled:pointer-events-none cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        title={t("moveDown")}
                        aria-label={t("moveDown")}
                    >
                        <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-tech-red)] hover:bg-red-50 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                        title={t("deletePoint")}
                        aria-label={t("deletePoint")}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
}

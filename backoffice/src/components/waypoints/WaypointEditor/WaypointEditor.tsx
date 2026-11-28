"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib";
import type { Hub } from "@/types";
import {
    isHubWaypointItem,
    parseHubActionItems,
    parseWaypointActionItems,
    type WaypointItem,
} from "../types";
import { WaypointEditorHeader } from "./WaypointEditorHeader";
import { WaypointPositionSubTab } from "./WaypointPositionSubTab";
import { WaypointActionsSubTab } from "./WaypointActionsSubTab";
import { WaypointConditionsSubTab } from "./WaypointConditionsSubTab";

export interface WaypointEditorProps<T extends WaypointItem> {
    waypoint: T;
    onUpdate: (wp: T) => void;
    onClose: () => void;
    hubs?: Hub[];
    defaultAltitude: number;
    isReadOnly: boolean;
    fieldErrors: Record<string, string>;
    waypointIndex: number;
    altWaypointIndex?: number;
    onClearFieldError: (field: string) => void;
}

export function WaypointEditor<T extends WaypointItem>({
    waypoint,
    onUpdate,
    onClose,
    hubs,
    defaultAltitude,
    isReadOnly,
    fieldErrors,
    waypointIndex,
    altWaypointIndex,
    onClearFieldError,
}: WaypointEditorProps<T>) {
    const t = useTranslations("waypoints.editor.tabs");

    const primaryPrefix = waypointIndex >= 0 ? `waypoints.${waypointIndex}.` : "";
    const secondaryPrefix =
        altWaypointIndex !== undefined && altWaypointIndex >= 0
            ? `waypoints.${altWaypointIndex}.`
            : "";

    const getWpError = (field: string): string | undefined => {
        if (primaryPrefix && fieldErrors[`${primaryPrefix}${field}`]) {
            return fieldErrors[`${primaryPrefix}${field}`];
        }
        if (secondaryPrefix && fieldErrors[`${secondaryPrefix}${field}`]) {
            return fieldErrors[`${secondaryPrefix}${field}`];
        }
        return undefined;
    };

    const clearWpError = (field: string) => {
        if (primaryPrefix) onClearFieldError?.(`${primaryPrefix}${field}`);
        if (secondaryPrefix) onClearFieldError?.(`${secondaryPrefix}${field}`);
    };

    const nameError = getWpError("name");
    const latError = getWpError("latitude");
    const lngError = getWpError("longitude");
    const altError = getWpError("altitude");
    const hubIdError = getWpError("hubId");
    const stopoverTypeError = getWpError("stopoverType");
    const groundTimeError = getWpError("groundTimeMinutes");
    const payloadDeltaError = getWpError("payloadDeltaKg");
    const actionsError =
        getWpError("actions") ||
        getWpError("hoverDurationSec") ||
        getWpError("waitForConfirmation");
    const conditionsError =
        getWpError("conditions") ||
        getWpError("speedToWaypoint") ||
        getWpError("headingAtWaypoint") ||
        getWpError("turnRadius");

    const hasPositionErrors = Boolean(nameError || latError || lngError || altError || hubIdError);
    const hasActionsErrors = Boolean(
        actionsError || stopoverTypeError || groundTimeError || payloadDeltaError
    );
    const hasConditionsErrors = Boolean(conditionsError);

    const [activeSubTab, setActiveSubTab] = useState<"position" | "actions" | "conditions">(() =>
        hasActionsErrors && !hasPositionErrors ? "actions" : "position"
    );
    const [prevHadActionErr, setPrevHadActionErr] = useState(hasActionsErrors);
    if (hasActionsErrors !== prevHadActionErr) {
        setPrevHadActionErr(hasActionsErrors);
        if (hasActionsErrors && !hasPositionErrors) {
            setActiveSubTab("actions");
        }
    }

    const actionBadgeCount = useMemo(() => {
        if (isHubWaypointItem(waypoint)) {
            return parseHubActionItems(waypoint).length;
        }
        return parseWaypointActionItems(waypoint).length;
    }, [waypoint]);

    const allWaypointErrors = useMemo(() => {
        const msgs = new Set<string>();
        for (const [key, msg] of Object.entries(fieldErrors)) {
            if (!msg) continue;
            if (
                (primaryPrefix && key.startsWith(primaryPrefix)) ||
                (secondaryPrefix && key.startsWith(secondaryPrefix))
            ) {
                const fieldLabel = key.split(".").slice(2).join(".");
                msgs.add(fieldLabel ? `${fieldLabel}: ${msg}` : msg);
            }
        }
        return Array.from(msgs);
    }, [fieldErrors, primaryPrefix, secondaryPrefix]);

    return (
        <div className="space-y-3.5">
            <WaypointEditorHeader waypoint={waypoint} onClose={onClose} />

            {allWaypointErrors.length > 0 && (
                <div
                    role="alert"
                    className="p-2.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2"
                >
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                    <div className="space-y-0.5 font-mono text-[11px]">
                        {allWaypointErrors.map((errText) => (
                            <div key={errText}>{errText}</div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-3 bg-[var(--color-surface-card)] p-1 rounded-md text-[11px] font-semibold text-center border border-[var(--color-border-default)]">
                <button
                    type="button"
                    onClick={() => setActiveSubTab("position")}
                    className={cn(
                        "py-1 rounded transition-colors cursor-pointer flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                        activeSubTab === "position"
                            ? "bg-[var(--color-surface-panel)] shadow-2xs text-[var(--color-text-primary)] font-bold"
                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                        hasPositionErrors && "text-red-600"
                    )}
                >
                    <span>{t("position")}</span>
                    {hasPositionErrors && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                </button>
                <button
                    type="button"
                    onClick={() => setActiveSubTab("actions")}
                    className={cn(
                        "py-1 rounded transition-colors cursor-pointer flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                        activeSubTab === "actions"
                            ? "bg-[var(--color-surface-panel)] shadow-2xs text-[var(--color-text-primary)] font-bold"
                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                        hasActionsErrors && "text-red-600"
                    )}
                >
                    <span>
                        {t("actions")}
                        {actionBadgeCount > 0 ? ` (${actionBadgeCount})` : ""}
                    </span>
                    {hasActionsErrors && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                </button>
                <button
                    type="button"
                    onClick={() => setActiveSubTab("conditions")}
                    className={cn(
                        "py-1 rounded transition-colors cursor-pointer flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                        activeSubTab === "conditions"
                            ? "bg-[var(--color-surface-panel)] shadow-2xs text-[var(--color-text-primary)] font-bold"
                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                        hasConditionsErrors && "text-red-600"
                    )}
                >
                    <span>{t("conditions")}</span>
                    {hasConditionsErrors && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    )}
                </button>
            </div>

            {activeSubTab === "position" && (
                <WaypointPositionSubTab
                    key={`${waypoint.id || waypoint.tempId}-${waypoint.hubId || "coord"}`}
                    waypoint={waypoint}
                    onUpdate={onUpdate}
                    hubs={hubs}
                    defaultAltitude={defaultAltitude}
                    isReadOnly={isReadOnly}
                    nameError={nameError}
                    latError={latError}
                    lngError={lngError}
                    altError={altError}
                    hubIdError={hubIdError}
                    onClearNameError={() => clearWpError("name")}
                    onClearLatError={() => clearWpError("latitude")}
                    onClearLngError={() => clearWpError("longitude")}
                    onClearAltError={() => clearWpError("altitude")}
                    onClearHubIdError={() => clearWpError("hubId")}
                />
            )}

            {activeSubTab === "actions" && (
                <WaypointActionsSubTab
                    waypoint={waypoint}
                    onUpdate={onUpdate}
                    isReadOnly={isReadOnly}
                    error={actionsError}
                    stopoverTypeError={stopoverTypeError}
                    groundTimeError={groundTimeError}
                    payloadDeltaError={payloadDeltaError}
                    onClearStopoverTypeError={() => clearWpError("stopoverType")}
                    onClearGroundTimeError={() => clearWpError("groundTimeMinutes")}
                    onClearPayloadDeltaError={() => clearWpError("payloadDeltaKg")}
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
